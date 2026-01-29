import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Api, PaymentStatusCheck } from '../../core/services/api';
import { interval, Subscription } from 'rxjs';
import { switchMap, take, takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-payment-success',
  standalone: false,
  templateUrl: './payment-success.html',
  styleUrls: ['./payment-success.css']
})
export class PaymentSuccess implements OnInit, OnDestroy {
  isChecking = true;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'INITIATED' | 'CANCELLED' | 'UNKNOWN' = 'PENDING';
  orderId: number | null = null;
  errorMessage = '';
  checkAttempts = 0;
  maxAttempts = 20; // 20 attempts * 3 seconds = 1 minute max
  
  private pollSubscription?: Subscription;

  constructor(
    private apiService: Api,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('💳 Payment Success: Checking payment status...');
    
    // Get order ID from localStorage
    const orderIdStr = localStorage.getItem('pendingOrderId');
    const clientReference = localStorage.getItem('clientReference');
    
    if (!orderIdStr) {
      this.errorMessage = 'No pending order found. Please complete checkout first.';
      this.isChecking = false;
      this.cdr.detectChanges();
      this.toastr.error('No pending order found', 'Error');
      setTimeout(() => this.router.navigate(['/cart']), 3000);
      return;
    }

    this.orderId = parseInt(orderIdStr);
    console.log(`🔍 Checking payment for Order #${this.orderId}, Reference: ${clientReference}`);
    
    // Start polling payment status
    this.startPaymentStatusPolling();
  }

  ngOnDestroy(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  startPaymentStatusPolling(): void {
    if (!this.orderId) return;

    // Check immediately, then every 3 seconds
    this.checkPaymentStatus();

    this.pollSubscription = interval(3000).pipe(
      takeWhile(() => this.checkAttempts < this.maxAttempts && this.paymentStatus === 'PENDING' || this.paymentStatus === 'INITIATED'),
      switchMap(() => this.apiService.checkPaymentStatus(this.orderId!))
    ).subscribe({
      next: (response: PaymentStatusCheck) => {
        this.checkAttempts++;
        this.handlePaymentStatusResponse(response);
      },
      error: (error) => {
        console.error('❌ Error checking payment status:', error);
        this.checkAttempts++;
        
        if (this.checkAttempts >= this.maxAttempts) {
          this.paymentStatus = 'UNKNOWN';
          this.errorMessage = 'Unable to verify payment status. Please check your order history or contact support.';
          this.isChecking = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  checkPaymentStatus(): void {
    if (!this.orderId) return;

    this.apiService.checkPaymentStatus(this.orderId).subscribe({
      next: (response: PaymentStatusCheck) => {
        this.handlePaymentStatusResponse(response);
      },
      error: (error) => {
        console.error('❌ Error checking payment status:', error);
        this.errorMessage = 'Failed to check payment status. Please try again.';
        this.isChecking = false;
        this.cdr.detectChanges();
      }
    });
  }

  handlePaymentStatusResponse(response: PaymentStatusCheck): void {
    console.log('📊 Payment status response:', response);
    
    const status = response.order.payment_status;
    this.paymentStatus = status;
    this.cdr.detectChanges();

    if (status === 'PAID') {
      // Payment successful!
      console.log('✅ Payment confirmed!');
      this.isChecking = false;
      this.toastr.success('Payment completed successfully!', 'Success');
      
      // Clean up localStorage
      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('clientReference');
      
      // Navigate to order confirmation after a short delay
      setTimeout(() => {
        this.router.navigate(['/order-confirmation', this.orderId]);
      }, 2000);
      
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      // Payment failed
      console.log('❌ Payment failed or cancelled');
      this.isChecking = false;
      this.errorMessage = 'Payment was not completed. Please try again.';
      this.toastr.error('Payment failed', 'Error');
      this.cdr.detectChanges();
      
    } else if (status === 'PENDING' || status === 'INITIATED') {
      // Still processing
      console.log('⏳ Payment still processing...');
      
      if (this.checkAttempts >= this.maxAttempts) {
        this.isChecking = false;
        this.errorMessage = 'Payment verification is taking longer than expected. Please check your order history.';
        this.toastr.warning('Payment verification delayed', 'Please Wait');
        this.cdr.detectChanges();
      }
    }
  }

  retryPayment(): void {
    // Navigate back to cart
    this.router.navigate(['/cart']);
  }

  viewOrders(): void {
    // Navigate to orders page
    this.router.navigate(['/profile'], { fragment: 'orders' });
  }

  getStatusIcon(): string {
    switch (this.paymentStatus) {
      case 'PAID': return '✅';
      case 'FAILED': return '❌';
      case 'CANCELLED': return '🚫';
      case 'PENDING':
      case 'INITIATED': return '⏳';
      default: return '❓';
    }
  }

  getStatusText(): string {
    switch (this.paymentStatus) {
      case 'PAID': return 'Payment Successful';
      case 'FAILED': return 'Payment Failed';
      case 'CANCELLED': return 'Payment Cancelled';
      case 'PENDING': return 'Payment Pending';
      case 'INITIATED': return 'Processing Payment';
      default: return 'Unknown Status';
    }
  }

  getStatusClass(): string {
    switch (this.paymentStatus) {
      case 'PAID': return 'text-success';
      case 'FAILED':
      case 'CANCELLED': return 'text-danger';
      case 'PENDING':
      case 'INITIATED': return 'text-warning';
      default: return 'text-secondary';
    }
  }
}
