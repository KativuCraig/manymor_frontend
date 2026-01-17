import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CartService } from '../../core/services/cart';
import { Api, Cart } from '../../core/services/api';

@Component({
  selector: 'app-checkout',
  standalone:false,
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class Checkout implements OnInit {
  currentStep = 1;
  isLoading = true;
  isProcessing = false;
  errorMessage = '';
  
  // Forms
  shippingForm!: FormGroup;
  paymentForm!: FormGroup;
  
  // Data
  cart: Cart | null = null;
  shippingInfo: any = {};
  paymentInfo: any = {};
  agreeTerms = false;
  termsTouched = false;
  
  // Default image
  private defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';

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
    // Shipping Form
    this.shippingForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      zipCode: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^07[0-9]{8}$/)]],
      email: ['', [Validators.required, Validators.email]],
      shippingMethod: ['standard', [Validators.required]]
    });

    // Payment Form
    this.paymentForm = this.fb.group({
      paymentMethod: ['card', [Validators.required]],
      cardNumber: [''],
      expiryDate: [''],
      cvv: [''],
      cardName: ['']
    });

    // Update validation based on payment method
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      const cardNumber = this.paymentForm.get('cardNumber');
      const expiryDate = this.paymentForm.get('expiryDate');
      const cvv = this.paymentForm.get('cvv');
      const cardName = this.paymentForm.get('cardName');

      if (method === 'card') {
        cardNumber?.setValidators([Validators.required]);
        expiryDate?.setValidators([Validators.required]);
        cvv?.setValidators([Validators.required]);
        cardName?.setValidators([Validators.required]);
      } else {
        cardNumber?.clearValidators();
        expiryDate?.clearValidators();
        cvv?.clearValidators();
        cardName?.clearValidators();
      }

      cardNumber?.updateValueAndValidity();
      expiryDate?.updateValueAndValidity();
      cvv?.updateValueAndValidity();
      cardName?.updateValueAndValidity();
    });
  }

  loadCart(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.cartService.cart$.subscribe({
      next: (cart) => {
        console.log(' Checkout cart loaded:', cart);
        this.cart = cart;
        
        if (!cart || cart.items.length === 0) {
          this.errorMessage = 'Your cart is empty. Please add items before checkout.';
          this.toastr.warning('Your cart is empty', 'Cart Empty');
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading cart:', error);
        this.errorMessage = 'Failed to load cart. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toastr.error('Failed to load cart', 'Error');
      }
    });
  }

  proceedToPayment(): void {
    if (this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      this.toastr.warning('Please fill all required shipping information', 'Incomplete Form');
      return;
    }

    this.shippingInfo = { ...this.shippingForm.value };
    this.currentStep = 2;
    console.log('Shipping info saved:', this.shippingInfo);
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

    // Prepare order data
    const orderData = {
      shipping_address: this.formatShippingAddress(),
      payment_method: this.paymentInfo.paymentMethod,
      notes: `Shipping method: ${this.shippingInfo.shippingMethod === 'express' ? 'Express' : 'Standard'}`
    };

    console.log('Placing order with data:', orderData);

    // Call checkout API
    this.apiService.checkout(orderData).subscribe({
      next: (order) => {
        console.log('Order placed successfully:', order);
        
        // Clear cart
        this.cartService.clearCart();
        
        // Navigate to confirmation page
        this.router.navigate(['/order-confirmation', order.id]);
      },
      error: (error) => {
        console.error(' Error placing order:', error);
        this.isProcessing = false;
        this.cdr.detectChanges();
        
        const errorMsg = error.error?.message || 'Failed to place order. Please try again.';
        this.toastr.error(errorMsg, 'Order Failed');
      }
    });
  }

  formatShippingAddress(): string {
    const info = this.shippingInfo;
    return `${info.firstName} ${info.lastName}, ${info.address}, ${info.city}, ${info.zipCode}, Phone: ${info.phone}`;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'card': 'Credit/Debit Card',
      'bank': 'Bank Transfer',
      'mobile': 'Mobile Money'
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

  getShippingCost(): number {
    return this.shippingInfo.shippingMethod === 'express' ? 10 : 0;
  }

  getTax(): number {
    // 15% tax on subtotal
    return this.getSubtotal() * 0.15;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getShippingCost() + this.getTax();
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