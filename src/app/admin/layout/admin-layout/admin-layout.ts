import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Api } from '../../../core/services/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayout implements OnInit {
  sidebarCollapsed = false;
  breadcrumb = '';
  userEmail = '';
  currentYear = new Date().getFullYear();
  lastUpdated = new Date().toLocaleDateString();
  
  // Stats
  stats = {
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    pendingDeliveries: 0
  };
  
  // Notifications
  notifications: Array<{ type: string; message: string; time: string }> = [];
  
  notificationCount = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private apiService: Api
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.setupBreadcrumb();
    this.loadAdminStats();
    
    // Update breadcrumb on route change
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setupBreadcrumb();
      }
    });
  }

  loadUserInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userEmail = user.email;
    }
  }

  setupBreadcrumb(): void {
    const url = this.router.url;
    
    // Extract breadcrumb from URL
    if (url === '/admin' || url === '/admin/dashboard') {
      this.breadcrumb = 'Dashboard';
    } else if (url.includes('/admin/products')) {
      this.breadcrumb = 'Products';
    } else if (url.includes('/admin/orders')) {
      this.breadcrumb = 'Orders';
    } else if (url.includes('/admin/categories')) {
      this.breadcrumb = 'Categories';
    } else if (url.includes('/admin/delivery')) {
      this.breadcrumb = 'Delivery';
    } else if (url.includes('/admin/customers')) {
      this.breadcrumb = 'Customers';
    } else if (url.includes('/admin/analytics')) {
      this.breadcrumb = 'Analytics';
    } else {
      this.breadcrumb = '';
    }
    
    this.cdr.detectChanges();
  }

  loadAdminStats(): void {
    forkJoin({
      summary: this.apiService.getAdminSummary(),
      products: this.apiService.getProducts(),
      orders: this.apiService.getAdminOrders(), // Use admin orders endpoint
      customers: this.apiService.getCustomers(),
      stockAlerts: this.apiService.getStockAlerts()
    })
    .pipe(
      finalize(() => this.cdr.detectChanges())
    )
    .subscribe({
      next: (response) => {
        // Handle orders response format
        let ordersArray: any[] = [];
        if (Array.isArray(response.orders)) {
          ordersArray = response.orders;
        } else if (response.orders && (response.orders as any).orders) {
          ordersArray = (response.orders as any).orders;
        } else if (response.orders && (response.orders as any).results) {
          ordersArray = (response.orders as any).results;
        }

        // Update stats from API
        this.stats.totalOrders = response.summary.total_orders;
        this.stats.totalRevenue = typeof response.summary.total_revenue === 'string' 
          ? parseFloat(response.summary.total_revenue) 
          : response.summary.total_revenue;
        this.stats.totalProducts = response.products.length;
        this.stats.totalCustomers = response.customers.length;
        
        // Calculate pending orders
        this.stats.pendingOrders = ordersArray.filter((o: any) => o.status === 'PLACED').length;
        
        // Calculate pending deliveries (not delivered yet)
        this.stats.pendingDeliveries = ordersArray.filter((o: any) => o.status !== 'DELIVERED').length;
        
        // Build notifications from stock alerts
        this.notifications = [];
        
        // Add low stock notifications
        if (response.stockAlerts.low_stock && response.stockAlerts.low_stock.length > 0) {
          response.stockAlerts.low_stock.forEach(product => {
            this.notifications.push({
              type: 'product',
              message: `${product.name} is low in stock`,
              time: 'Now'
            });
          });
        }
        
        // Add out of stock notifications
        if (response.stockAlerts.out_of_stock && response.stockAlerts.out_of_stock.length > 0) {
          response.stockAlerts.out_of_stock.forEach(product => {
            this.notifications.push({
              type: 'alert',
              message: `${product.name} is out of stock`,
              time: 'Now'
            });
          });
        }
        
        this.notificationCount = this.notifications.length;
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading admin stats:', error);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'order': 'bi-cart text-primary',
      'product': 'bi-box text-warning',
      'user': 'bi-person text-success',
      'alert': 'bi-exclamation-triangle text-danger'
    };
    return icons[type] || 'bi-bell text-secondary';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}