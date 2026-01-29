import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CartService } from '../../core/services/cart';
import { Api, Cart, CheckoutResponse } from '../../core/services/api';
import { Subscription, forkJoin } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-checkout',
  standalone:false,
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class Checkout implements OnInit, OnDestroy {
  currentStep = 1;
  isLoading = true;
  isProcessing = false;
  errorMessage = '';
  
  // Forms
  deliveryForm!: FormGroup;
  paymentForm!: FormGroup;
  
  // Data
  cart: Cart | null = null;
  deliveryInfo: any = {};
  paymentInfo: any = {};
  agreeTerms = false;
  termsTouched = false;
  
  // Default image
  private defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';
  
  // Subscription
  private cartSubscription?: Subscription;

  constructor(
    private cartService: CartService,
    private apiService: Api,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('💰 Checkout: Initializing...');
    this.initForms();
    this.loadCart();
  }

  initForms(): void {
    // Delivery Form - updated for Zimbabwe phone format
    this.deliveryForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      zipCode: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+263|0)[7][0-9]{8}$/)]],
      email: ['', [Validators.required, Validators.email]]
    });

    // Payment Form - Simplified for ClicknPay (mobile money)
    this.paymentForm = this.fb.group({
      paymentMethod: ['mobile', [Validators.required]]
    });
  }

  loadCart(): void {
    this.isLoading = true;

    // Use filter to skip null values until we get actual cart data
    // This prevents showing "empty cart" error during initial load
    this.cartSubscription = this.cartService.cart$.pipe(
      // Skip the first emission if it's null (initial state)
      filter((cart, index) => index > 0 || cart !== null)
    ).subscribe({
      next: (cart) => {
        console.log(' Checkout cart loaded:', cart);
        this.cart = cart;
        
        if (!cart || cart.items.length === 0) {
          this.errorMessage = 'Your cart is empty. Please add items before checkout.';
          this.toastr.warning('Your cart is empty', 'Cart Empty');
        }
        
        this.isLoading = false;
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (error) => {
        console.error('❌ Error loading cart:', error);
        this.errorMessage = 'Failed to load cart. Please try again.';
        this.isLoading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
        this.toastr.error('Failed to load cart', 'Error');
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  proceedToPayment(): void {
    if (this.deliveryForm.invalid) {
      this.markFormGroupTouched(this.deliveryForm);
      this.toastr.warning('Please fill all required delivery information', 'Incomplete Form');
      return;
    }

    this.deliveryInfo = { ...this.deliveryForm.value };
    this.currentStep = 2;
    console.log('Delivery info saved:', this.deliveryInfo);
  }

  proceedToReview(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      this.toastr.warning('Please complete payment information', 'Incomplete Form');
      return;
    }

    this.paymentInfo = { ...this.paymentForm.value };
    this.currentStep = 3;
    console.log('Payment info saved:', this.paymentInfo);
  }

  placeOrder(): void {
    this.termsTouched = true;
    
    if (!this.agreeTerms) {
      this.toastr.warning('Please agree to terms and conditions', 'Terms Required');
      return;
    }

    if (!this.cart || this.cart.items.length === 0) {
      this.toastr.error('Your cart is empty', 'Error');
      return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();

    // Format phone number for Zimbabwe (+263)
    let phoneNumber = this.deliveryInfo.phone;
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '+263' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+263' + phoneNumber;
    }

    // Prepare checkout data for ClicknPay
    const checkoutData = {
      phone_number: phoneNumber,
      shipping_address: this.formatDeliveryAddress(),
      return_url: `${window.location.origin}/payment-success`
    };

    console.log('🔐 Initiating ClicknPay checkout with data:', checkoutData);

    // Call checkout API
    this.apiService.checkout(checkoutData).subscribe({
      next: (response: CheckoutResponse) => {
        console.log('✅ Checkout successful:', response);
        
        // Store order info for payment return handler
        localStorage.setItem('pendingOrderId', response.order.id.toString());
        localStorage.setItem('clientReference', response.payment.clientReference);
        
        // Clear cart
        this.cartService.clearCart();
        
        this.toastr.success('Redirecting to payment gateway...', 'Order Created');
        
        // Redirect to ClicknPay payment page
        window.location.href = response.payment.paymeURL;
      },
      error: (error) => {
        console.error('❌ Error placing order:', error);
        this.isProcessing = false;
        this.cdr.detectChanges();
        
        const errorMsg = error.error?.detail || error.error?.message || 'Failed to initiate payment. Please try again.';
        this.toastr.error(errorMsg, 'Payment Failed');
      }
    });
  }

  formatDeliveryAddress(): string {
    const info = this.deliveryInfo;
    return `${info.firstName} ${info.lastName}, ${info.address}, ${info.city}, ${info.zipCode}, Phone: ${info.phone}`;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'mobile': 'Mobile Money (ClicknPay)'
    };
    return labels[method] || method;
  }

  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0].image;
    }
    return this.defaultProductImage;
  }

  getSubtotal(): number {
    if (!this.cart) return 0;
    
    return this.cart.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  getTotal(): number {
    return this.getSubtotal();
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.currentStep = step;
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}