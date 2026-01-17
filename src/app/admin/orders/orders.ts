import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, Order } from '../../core/services/api';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  
  isLoading = true;
  showOrderModal = false;
  selectedOrder: Order | null = null;
  
  searchTerm = '';
  statusFilter: string = 'all';
  paymentFilter: string = 'all';

  statusOptions = [
    { value: 'PLACED', label: 'Placed', class: 'bg-info' },
    { value: 'PACKED', label: 'Packed', class: 'bg-primary' },
    { value: 'DISPATCHED', label: 'Dispatched', class: 'bg-warning' },
    { value: 'IN_TRANSIT', label: 'In Transit', class: 'bg-info' },
    { value: 'DELIVERED', label: 'Delivered', class: 'bg-success' }
  ];

  paymentOptions = [
    { value: 'PAID', label: 'Paid', class: 'bg-success' },
    { value: 'PENDING', label: 'Pending', class: 'bg-warning' },
    { value: 'FAILED', label: 'Failed', class: 'bg-danger' }
  ];

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    // Use getAdminOrders to fetch ALL orders, not just the current user's orders
    this.apiService.getAdminOrders()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Orders received:', response);
          
          // Handle different response formats
          if (Array.isArray(response)) {
            // Plain array response
            this.orders = response;
          } else if (response && (response as any).orders) {
            // Backend returns { count: X, orders: [...] }
            this.orders = (response as any).orders;
          } else if (response && (response as any).results) {
            // Paginated response { results: [...] }
            this.orders = (response as any).results;
          } else {
            console.error('Unexpected orders format:', response);
            this.orders = [];
          }
          
          // Sort orders by created date
          this.orders = this.orders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          console.log('Processed orders:', this.orders.length, 'orders');
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          alert('Failed to load orders');
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.orders];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toString().includes(term) ||
        o.status.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === this.statusFilter);
    }

    // Payment filter
    if (this.paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_status === this.paymentFilter);
    }

    this.filteredOrders = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onPaymentFilterChange(): void {
    this.applyFilters();
  }

  viewOrder(order: Order): void {
    this.selectedOrder = order;
    this.showOrderModal = true;
  }

  closeModal(): void {
    this.showOrderModal = false;
    this.selectedOrder = null;
  }

  cancelOrder(orderId: number): void {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    this.apiService.cancelOrder(orderId)
      .pipe(
        finalize(() => this.cdr.detectChanges())
      )
      .subscribe({
        next: () => {
          this.loadOrders();
          this.closeModal();
          alert('Order cancelled successfully');
        },
        error: (error) => {
          console.error('Error cancelling order:', error);
          alert('Failed to cancel order. Order might not be in PLACED status.');
        }
      });
  }

  getStatusClass(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option ? option.class : 'bg-secondary';
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option ? option.label : status;
  }

  getPaymentStatusClass(status: string): string {
    const option = this.paymentOptions.find(p => p.value === status);
    return option ? option.class : 'bg-secondary';
  }

  getPaymentStatusLabel(status: string): string {
    const option = this.paymentOptions.find(p => p.value === status);
    return option ? option.label : status;
  }

  calculateOrderTotal(order: Order): number {
    return order.total_amount;
  }

  getItemCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
