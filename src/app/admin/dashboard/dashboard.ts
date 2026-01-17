import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Api, AdminSummary, AdminSalesResponse, StockAlertsResponse } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesChartCanvas') salesChartCanvas!: ElementRef;
  
  user: any = null;
  summary: AdminSummary = {
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    total_products: 0,
    low_stock_count: 0,
    recent_orders: 0,
    pending_orders: 0
  };
  
  salesData: any[] = [];
  salesByStatus: any[] = [];
  topProducts: any[] = [];
  lowStockProducts: any[] = [];
  outOfStockProducts: any[] = [];
  recentOrders: any[] = [];
  
  isLoading = true;
  private salesChart: Chart | null = null;

  constructor(
    private apiService: Api,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart will be initialized after data loads
  }

  ngOnDestroy(): void {
    if (this.salesChart) {
      this.salesChart.destroy();
    }
  }

  loadDashboardData(): void {
    console.log('Dashboard: Loading data...');
    this.isLoading = true;

    forkJoin({
      summary: this.apiService.getAdminSummary(),
      sales: this.apiService.getAdminSales(30),
      stockAlerts: this.apiService.getStockAlerts(10),
      orders: this.apiService.getAdminOrders() // Fetch ALL orders for admin
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Dashboard: Data loaded successfully!');
      })
    )
    .subscribe({
      next: (response) => {
        console.log('Dashboard: Raw API Response:', response);
        
        // Process admin summary
        this.summary = response.summary;
        console.log('Dashboard: Summary data:', this.summary);
        
        // Get recent orders from the orders list (latest 5)
        let ordersArray: any[] = [];
        
        if (Array.isArray(response.orders)) {
          // Plain array response
          ordersArray = response.orders;
        } else if (response.orders && (response.orders as any).orders) {
          // Backend returns { count: X, orders: [...] }
          ordersArray = (response.orders as any).orders;
        } else if (response.orders && (response.orders as any).results) {
          // Paginated response { results: [...] }
          ordersArray = (response.orders as any).results;
        } else {
          console.warn('Dashboard: Unexpected orders format:', response.orders);
          ordersArray = [];
        }
        
        this.recentOrders = ordersArray
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
        console.log('Dashboard: Recent orders:', this.recentOrders);

        // Process sales data
        this.salesData = response.sales.daily_sales || [];
        this.salesByStatus = response.sales.sales_by_status || [];
        this.topProducts = response.sales.top_products || [];
        console.log('Dashboard: Sales data:', {
          daily_sales: this.salesData.length,
          sales_by_status: this.salesByStatus.length,
          top_products: this.topProducts.length
        });
        console.log('Dashboard: Daily sales sample (first 3 days):', this.salesData.slice(0, 3));
        console.log('Dashboard: Daily sales sample (last 3 days):', this.salesData.slice(-3));
        console.log('Dashboard: Top products sample:', this.topProducts[0]);

        // Process stock alerts
        this.lowStockProducts = response.stockAlerts.low_stock || [];
        this.outOfStockProducts = response.stockAlerts.out_of_stock || [];
        console.log('Dashboard: Stock alerts:', {
          low_stock: this.lowStockProducts.length,
          out_of_stock: this.outOfStockProducts.length
        });
        console.log('Dashboard: Low stock product sample:', this.lowStockProducts[0]);

        // Initialize chart if we have sales data
        if (this.salesData.length > 0) {
          setTimeout(() => this.initSalesChart(), 0);
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Dashboard: Failed to load data', error);
        console.error('Dashboard: Error details:', error.error);
        this.cdr.detectChanges();
      }
    });
  }

  initSalesChart(): void {
    if (!this.salesChartCanvas || this.salesData.length === 0) {
      return;
    }

    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    
    // Prepare chart data
    const labels = this.salesData.map((item: any) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const salesData = this.salesData.map((item: any) => parseFloat(item.revenue) || 0);
    const ordersData = this.salesData.map((item: any) => item.orders_count || 0);

    // Destroy existing chart
    if (this.salesChart) {
      this.salesChart.destroy();
    }

    // Create new chart with two datasets
    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Sales ($)',
            data: salesData,
            borderColor: '#ff0000',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'Daily Orders',
            data: ordersData,
            borderColor: '#343a40',
            backgroundColor: 'rgba(52, 58, 64, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            borderDash: [5, 5],
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Sales ($)'
            },
            ticks: {
              callback: (value) => {
                return '$' + value;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Orders'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    });
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

  getPendingOrdersCount(): number {
    return typeof this.summary.pending_orders === 'number' 
      ? this.summary.pending_orders 
      : 0;
  }

  getProductImage(product: any): string {
    // For top_products from sales API - images is an array of URL strings
    if (product.images && product.images.length > 0) {
      // Images is directly an array of strings
      return product.images[0];
    }
    // For nested product object (in order items)
    if (product.product?.images && product.product.images.length > 0) {
      return product.product.images[0];
    }
    // Fallback to category-based placeholder images
    const category = product.category || product.product?.category_name || '';
    return this.getCategoryPlaceholderImage(category);
  }

  getCategoryPlaceholderImage(category: string): string {
    // Map category names to placeholder images
    const placeholderImages: { [key: string]: string } = {
      'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
      'Gadgets': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
      'Clothing': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
      'Fashion': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
      'Home': 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
      'Kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
      'Furniture': 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80',
      'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
      'Toys': 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      'Beauty': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    };

    // Return category-specific image or default
    return placeholderImages[category] || 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';
  }

  getProductName(product: any): string {
    return product.name || product.product?.name || 'Unknown Product';
  }

  getProductCategory(product: any): string {
    return product.category_name || product.product?.category_name || 'Uncategorized';
  }

  getProductPrice(product: any): number {
    return product.price || product.product?.price || 0;
  }
}