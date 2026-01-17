import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, Order, Delivery as DeliveryType } from '../../core/services/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-delivery',
  standalone: false,
  templateUrl: './delivery.html',
  styleUrl: './delivery.css',
})
export class Delivery implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  deliveries: Map<number, DeliveryType> = new Map();
  
  isLoading = true;
  showUpdateModal = false;
  isUpdating = false;
  
  selectedOrder: Order | null = null;
  selectedDelivery: DeliveryType | null = null;
  
  searchTerm = '';
  statusFilter: string = 'all';
  
  updateForm = {
    status: '' as DeliveryType['status'],
    notes: ''
  };

  statusOptions = [
    { value: 'PLACED', label: 'Placed', class: 'bg-info', icon: 'bi-cart-check' },
    { value: 'PACKED', label: 'Packed', class: 'bg-primary', icon: 'bi-box-seam' },
    { value: 'DISPATCHED', label: 'Dispatched', class: 'bg-warning', icon: 'bi-truck' },
    { value: 'IN_TRANSIT', label: 'In Transit', class: 'bg-info', icon: 'bi-arrow-repeat' },
    { value: 'DELIVERED', label: 'Delivered', class: 'bg-success', icon: 'bi-check-circle' }
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
    // Use admin orders endpoint to get ALL orders
    this.apiService.getAdminOrders()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Delivery: Orders received:', response);
          
          // Handle different response formats
          if (Array.isArray(response)) {
            this.orders = response;
          } else if (response && (response as any).orders) {
            this.orders = (response as any).orders;
          } else if (response && (response as any).results) {
            this.orders = (response as any).results;
          } else {
            console.error('Unexpected orders format:', response);
            this.orders = [];
          }
          
          // Sort orders by created date
          this.orders = this.orders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          console.log('Delivery: Processed orders:', this.orders.length, 'orders');
          this.applyFilters();
          this.loadDeliveries();
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          alert('Failed to load orders');
        }
      });
  }

  loadDeliveries(): void {
    this.orders.forEach(order => {
      this.apiService.getDelivery(order.id).subscribe({
        next: (delivery) => {
          this.deliveries.set(order.id, delivery);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.log(`No delivery found for order ${order.id}`);
        }
      });
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

    this.filteredOrders = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  openUpdateModal(order: Order): void {
    this.selectedOrder = order;
    this.selectedDelivery = this.deliveries.get(order.id) || null;
    this.updateForm = {
      status: order.status,
      notes: ''
    };
    this.showUpdateModal = true;
  }

  closeModal(): void {
    this.showUpdateModal = false;
    this.selectedOrder = null;
    this.selectedDelivery = null;
  }

  updateDeliveryStatus(): void {
    if (!this.selectedOrder || !this.updateForm.status) {
      alert('Please select a status');
      return;
    }

    this.isUpdating = true;

    this.apiService.updateDeliveryStatus(
      this.selectedOrder.id, 
      this.updateForm.status,
      this.updateForm.notes
    )
    .pipe(
      finalize(() => {
        this.isUpdating = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: () => {
        this.closeModal();
        this.loadOrders();
        alert('Delivery status updated successfully');
      },
      error: (error) => {
        console.error('Error updating delivery status:', error);
        alert('Failed to update delivery status');
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

  getStatusIcon(status: string): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option ? option.icon : 'bi-question-circle';
  }

  getNextStatus(currentStatus: string): DeliveryType['status'] | null {
    const statusOrder: DeliveryType['status'][] = ['PLACED', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus as DeliveryType['status']);
    
    if (currentIndex < statusOrder.length - 1) {
      return statusOrder[currentIndex + 1];
    }
    
    return null;
  }

  canUpdateStatus(status: string): boolean {
    return status !== 'DELIVERED';
  }

  getDeliveryInfo(orderId: number): DeliveryType | null {
    return this.deliveries.get(orderId) || null;
  }

  getStatusIndex(status: string): number {
    return this.statusOptions.findIndex(s => s.value === status);
  }
}
