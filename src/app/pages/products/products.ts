import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Api, Product, Category } from '../../core/services/api';
import { CartService } from '../../core/services/cart';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-products',
  standalone:false,
  templateUrl: './products.html',
  styleUrls: ['./products.css']
})
export class Products implements OnInit {
  // ==================== DATA ====================
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  
  // ==================== LOADING STATES ====================
  isLoading = true;
  
  // ==================== FILTERS ====================
  searchQuery = '';
  selectedCategory = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  inStockOnly = false;
  sortBy = '';
  viewMode = 'grid'; // 'grid' or 'list'
  showFilters = true;
  
  // ==================== PAGINATION ====================
  currentPage = 1;
  pageSize = 12;
  totalProducts = 0;
  totalPages = 1;
  
  // ==================== ACTIVE FILTERS DISPLAY ====================
  activeFilters: string[] = [];
  
  // Default image for products without images
  defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';

  constructor(
    private apiService: Api,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Products: Initializing...');
    
    // Hide filters on mobile by default
    this.showFilters = window.innerWidth >= 768;
    
    // FIRST: Read query parameters from URL
    this.readRouteParameters();
    
    // THEN: Load data with those parameters
    this.loadInitialData();
  }

  // ==================== READ ROUTE PARAMETERS ====================
  readRouteParameters(): void {
    console.log(' Reading route parameters...');
    
    this.route.queryParams.subscribe(params => {
      console.log(' Route params:', params);
      
      // Store previous values to detect changes
      const prevSearch = this.searchQuery;
      const prevCategory = this.selectedCategory;
      const prevMinPrice = this.minPrice;
      const prevMaxPrice = this.maxPrice;
      const prevInStock = this.inStockOnly;
      const prevSort = this.sortBy;
      const prevPage = this.currentPage;
      
      // Update filter values from URL
      this.searchQuery = params['search'] || '';
      this.selectedCategory = params['category'] || '';
      this.minPrice = params['min_price'] ? parseFloat(params['min_price']) : null;
      this.maxPrice = params['max_price'] ? parseFloat(params['max_price']) : null;
      this.inStockOnly = params['in_stock'] === 'true';
      this.sortBy = params['sort'] || '';
      this.currentPage = params['page'] ? parseInt(params['page']) : 1;
      
      // Validate page number
      if (this.currentPage < 1) {
        this.currentPage = 1;
      }
      
      // Check if any filter changed (for debugging)
      const filtersChanged = 
        prevSearch !== this.searchQuery ||
        prevCategory !== this.selectedCategory ||
        prevMinPrice !== this.minPrice ||
        prevMaxPrice !== this.maxPrice ||
        prevInStock !== this.inStockOnly ||
        prevSort !== this.sortBy ||
        prevPage !== this.currentPage;
      
      if (filtersChanged) {
        console.log(' Filters updated from URL');
      }
      
      this.updateActiveFilters();
    });
  }

  // ==================== INITIAL DATA LOAD ====================
  loadInitialData(): void {
    console.log('Products: Loading products & categories...');

    forkJoin({
      products: this.apiService.getProducts(),
      categories: this.apiService.getCategories()
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Products: Data loaded successfully!');
      })
    )
    .subscribe({
      next: (response) => {
        //  Products
        this.allProducts = Array.isArray(response.products)
          ? response.products
          : [];
        
        //  Categories
        this.categories = Array.isArray(response.categories)
          ? response.categories
          : [];
        
        // Apply filters AFTER data is loaded
        this.applyFilters();
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(' Products: Failed to load data', error);
        this.allProducts = [];
        this.categories = [];
        this.filteredProducts = [];
        this.cdr.detectChanges();
        this.toastr.error('Failed to load products', 'Error');
      }
    });
  }

  // ==================== FILTER LOGIC ====================
  applyFilters(): void {
    console.log(' Applying filters...', {
      search: this.searchQuery,
      category: this.selectedCategory,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      inStockOnly: this.inStockOnly,
      sortBy: this.sortBy
    });
    
    // Start with all products
    let filtered = [...this.allProducts];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category_name.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(product =>
        product.category.toString() === this.selectedCategory
      );
    }
    
    // Apply price range filter
    if (this.minPrice !== null) {
      filtered = filtered.filter(product => product.price >= this.minPrice!);
    }
    
    if (this.maxPrice !== null) {
      filtered = filtered.filter(product => product.price <= this.maxPrice!);
    }
    
    // Apply stock filter
    if (this.inStockOnly) {
      filtered = filtered.filter(product => product.stock_quantity > 0);
    }
    
    // Apply sorting
    if (this.sortBy) {
      filtered = this.sortProducts(filtered, this.sortBy);
    }
    
    // Update filtered products
    this.filteredProducts = filtered;
    this.totalProducts = filtered.length;
    this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
    
    // Ensure current page is valid
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
      this.updateUrlWithFilters(); // Update URL with corrected page
    }
    
    console.log(` Filtered: ${this.filteredProducts.length} products`);
    this.cdr.detectChanges();
  }

  sortProducts(products: Product[], sortBy: string): Product[] {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return sorted;
    }
  }

  // ==================== CLEAR FILTERS ====================
  clearFilters(): void {
    console.log(' Clearing all filters...');
    
    this.searchQuery = '';
    this.selectedCategory = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.inStockOnly = false;
    this.sortBy = '';
    this.currentPage = 1;
    
    // Reset to all products
    this.filteredProducts = [...this.allProducts];
    this.totalProducts = this.filteredProducts.length;
    this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
    
    this.activeFilters = [];
    
    // Clear URL parameters - IMPORTANT: This should navigate to clean URL
    this.router.navigate(['/products'], {
      queryParams: {},
      replaceUrl: true // This replaces the current URL in history
    });
    
    this.cdr.detectChanges();
    console.log(' Filters cleared, URL cleaned');
  }

  // ==================== UPDATE FILTERS FROM UI ====================
  updateFilters(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.applyFilters();
    this.updateUrlWithFilters();
  }

  updateActiveFilters(): void {
    this.activeFilters = [];
    
    if (this.searchQuery) this.activeFilters.push(`Search: "${this.searchQuery}"`);
    if (this.selectedCategory) {
      const category = this.categories.find(c => c.id.toString() === this.selectedCategory);
      if (category) this.activeFilters.push(`Category: ${category.name}`);
    }
    if (this.minPrice !== null) this.activeFilters.push(`Min Price: $${this.minPrice}`);
    if (this.maxPrice !== null) this.activeFilters.push(`Max Price: $${this.maxPrice}`);
    if (this.inStockOnly) this.activeFilters.push('In Stock Only');
    if (this.sortBy) {
      const sortLabels: { [key: string]: string } = {
        'price_asc': 'Price: Low to High',
        'price_desc': 'Price: High to Low',
        'name_asc': 'Name: A to Z',
        'name_desc': 'Name: Z to A',
        'newest': 'Newest First'
      };
      this.activeFilters.push(`Sorted: ${sortLabels[this.sortBy] || this.sortBy}`);
    }
  }

  updateUrlWithFilters(): void {
    const queryParams: any = {};
    
    if (this.searchQuery) queryParams.search = this.searchQuery;
    if (this.selectedCategory) queryParams.category = this.selectedCategory;
    if (this.minPrice !== null) queryParams.min_price = this.minPrice;
    if (this.maxPrice !== null) queryParams.max_price = this.maxPrice;
    if (this.inStockOnly) queryParams.in_stock = this.inStockOnly;
    if (this.sortBy) queryParams.sort = this.sortBy;
    if (this.currentPage > 1) queryParams.page = this.currentPage;
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge', // Merge with existing params
      replaceUrl: true // Replace current URL in browser history
    });
  }

  // ==================== CATEGORY HELPERS ====================
  selectCategory(categoryId: number | string): void {
    this.selectedCategory = categoryId.toString();
    this.updateFilters();
  }

  getCategoryCount(categoryId: number): number {
    return this.allProducts.filter(product => 
      product.category === categoryId
    ).length;
  }

  // ==================== PRODUCT HELPERS ====================
  getProductImage(product: Product): string {
  if (product.images && product.images.length > 0) {
    return product.images[0].image; // Show first image
  }
  return this.getCategoryPlaceholderImage(product.category);
}

  getCategoryPlaceholderImage(categoryId: number): string {
    const placeholderImages: { [key: number]: string } = {
      1: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
      2: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
      3: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
      4: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80',
    };

    return placeholderImages[categoryId] || this.defaultProductImage;
  }

  // ==================== CART FUNCTIONALITY ====================
  addToCart(product: Product): void {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Please login to add items to cart', 'Login Required');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (product.stock_quantity === 0) {
      this.toastr.warning('This product is out of stock!', 'Stock Alert');
      return;
    }

    this.cartService.addToCart(product.id, 1).subscribe({
      next: (cart) => {
        this.toastr.success(`${product.name} added to cart!`, 'Success');
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
        if (error.message.includes('Authentication required')) {
          this.toastr.info('Please login to add items to cart', 'Login Required');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: this.router.url } 
          });
        } else {
          this.toastr.error('Failed to add product to cart', 'Error');
        }
      }
    });
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  // ==================== UI CONTROLS ====================
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateUrlWithFilters();
      // No need to call applyFilters() because it will be triggered by route change
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // ==================== GETTERS FOR TEMPLATE ====================
  get products(): Product[] {
    if (!this.filteredProducts.length) return [];
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredProducts.slice(startIndex, endIndex);
  }
}