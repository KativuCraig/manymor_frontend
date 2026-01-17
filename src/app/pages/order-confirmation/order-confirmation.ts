import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Api, Order } from '../../core/services/api';

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

    this.apiService.getOrder(orderId).subscribe({
      next: (order) => {
        console.log('Order loaded:', order);
        this.order = order;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading order:', error);
        
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

  getSubtotal(): number {
    if (!this.order) return 0;
    
    return this.order.items.reduce((total, item) => {
      return total + (item.unit_price * item.quantity);
    }, 0);
  }

  getTax(): number {
    return this.getSubtotal() * 0.15;
  }

  getTotal(): number {
    if (!this.order) return 0;
    return this.order.total_amount;
  }
}