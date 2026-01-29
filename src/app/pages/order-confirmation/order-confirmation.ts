import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Api, Order, PaymentStatusCheck } from '../../core/services/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-order-confirmation',
  standalone:false,
  templateUrl: './order-confirmation.html',
  styleUrls: ['./order-confirmation.css']
})
export class OrderConfirmation implements OnInit {
  order: Order | null = null;
  isLoading = true;
  errorMessage = '';
  paymentStatusDetails: any = null;
  
  // Default image
  private defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: Api,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Order Confirmation: Initializing...');
    
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrder(parseInt(orderId));
      } else {
        this.errorMessage = 'Order ID not provided';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadOrder(orderId: number): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Use forkJoin to load order details and payment status simultaneously
    forkJoin({
      order: this.apiService.getOrder(orderId),
      paymentStatus: this.apiService.checkPaymentStatus(orderId)
    }).subscribe({
      next: (result) => {
        console.log('✅ Order and payment status loaded:', result);
        this.order = result.order;
        this.paymentStatusDetails = result.paymentStatus;
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Show notification based on payment status
        if (result.order.payment_status === 'PAID') {
          this.toastr.success('Your order has been confirmed!', 'Success');
        } else if (result.order.payment_status === 'PENDING') {
          this.toastr.warning('Payment is still pending', 'Pending Payment');
        }
      },
      error: (error) => {
        console.error('❌ Error loading order:', error);
        
        if (error.status === 404) {
          this.errorMessage = 'Order not found. It may have been cancelled or does not exist.';
        } else {
          this.errorMessage = 'Failed to load order details. Please try again.';
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toastr.error('Failed to load order', 'Error');
      }
    });
  }

  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0].image;
    }
    return this.defaultProductImage;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'PLACED': 'bg-info',
      'PACKED': 'bg-primary',
      'DISPATCHED': 'bg-warning text-dark',
      'IN_TRANSIT': 'bg-warning text-dark',
      'DELIVERED': 'bg-success'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  getPaymentStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'PAID': 'bg-success',
      'PENDING': 'bg-warning text-dark',
      'INITIATED': 'bg-info',
      'FAILED': 'bg-danger',
      'CANCELLED': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  getPaymentStatusIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'PAID': '✓',
      'PENDING': '⏳',
      'INITIATED': '🔄',
      'FAILED': '✗',
      'CANCELLED': '🚫'
    };
    return statusIcons[status] || '?';
  }

  getPaymentStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'PAID': 'Paid',
      'PENDING': 'Pending',
      'INITIATED': 'Processing',
      'FAILED': 'Failed',
      'CANCELLED': 'Cancelled'
    };
    return statusTexts[status] || status;
  }

  getSubtotal(): number {
    if (!this.order) return 0;
    
    return this.order.items.reduce((total, item) => {
      return total + (item.unit_price * item.quantity);
    }, 0);
  }

  getTotal(): number {
    if (!this.order) return 0;
    return this.order.total_amount;
  }
}