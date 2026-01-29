import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Api, Product, Category, Order } from '../../core/services/api';
import { AuthService } from '../../core/services/auth';
import { CartService } from '../../core/services/cart';
import { PromotionService } from '../../core/services/promotion.service';
import { CarouselPromotion } from '../../core/models/promotion.model';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {

  // ==================== DATA ====================
  products: Product[] = [];
  categories: Category[] = [];
  recentOrders: Order[] = [];
  carouselPromotions: CarouselPromotion[] = [];

  // ==================== CAROUSEL ====================
  currentSlide = 0;
  autoPlayInterval: any;

  // ==================== LOADING STATES ====================
  isLoadingProducts = true;
  isLoadingCategories = true;
  isLoadingCarousel = true;

  // Default image for products without images
  defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';

  constructor(
    private api: Api,
    private router: Router,
    public authService: AuthService,
    private cartService: CartService,
    private promotionService: PromotionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHomeData();
    this.loadRecentOrders();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  // ==================== HOME DATA ====================
  loadHomeData(): void {
    console.log('🏠 Home: Loading products, categories & carousel...');

    forkJoin({
      products: this.api.getProducts(),
      categories: this.api.getCategories(),
      carousel: this.promotionService.getActiveCarouselPromotions()
    })
    .pipe(
      finalize(() => {
        this.isLoadingProducts = false;
        this.isLoadingCategories = false;
        this.isLoadingCarousel = false;
        this.cdr.detectChanges();
        console.log('✅ Home: Data loaded successfully!');
      })
    )
    .subscribe({
      next: (response) => {
        // ✅ Products
        this.products = Array.isArray(response.products)
          ? response.products
          : [];

        // ✅ Categories
        this.categories = Array.isArray(response.categories)
          ? response.categories
          : [];

        // ✅ Carousel Promotions
        this.carouselPromotions = Array.isArray(response.carousel)
          ? response.carousel.sort((a, b) => a.display_order - b.display_order)
          : [];

        // Start carousel auto-play if we have promotions
        if (this.carouselPromotions.length > 1) {
          this.startAutoPlay();
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Home: Failed to load data', error);
        this.products = [];
        this.categories = [];
        this.carouselPromotions = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== RECENT ORDERS ====================
  loadRecentOrders(): void {
    // Only load orders if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, skipping order load');
      return;
    }

    this.api.getOrders().subscribe({
      next: (orders) => {
        this.recentOrders = orders || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading recent orders:', err);
        this.recentOrders = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== IMAGE HANDLING ====================
  /**
   * Get the first image for a product or return default
   */
  getProductImage(product: Product): string {
    if (product.images && product.images.length > 0) {
      // Return the first image URL
      return product.images[0].image;
    }
    
    // If no images, try to return a placeholder based on category
    return this.getCategoryPlaceholderImage(product.category);
  }

  /**
   * Handle image loading errors
   */
  handleImageError(event: Event, product: Product): void {
    const imgElement = event.target as HTMLImageElement;
    
    // Try to get a category-specific placeholder
    imgElement.src = this.getCategoryPlaceholderImage(product.category);
    
    // If that fails, use the default
    imgElement.onerror = () => {
      imgElement.src = this.defaultProductImage;
    };
  }

  /**
   * Get a placeholder image based on product category
   */
  getCategoryPlaceholderImage(categoryId: number): string {
    // You can map categories to specific placeholder images
    const placeholderImages: { [key: number]: string } = {
      1: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80', // Gadgets
      2: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80', // Kitchen
      3: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80', // Clothes
      4: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80', // Vehicles
    };

    return placeholderImages[categoryId] || this.defaultProductImage;
  }

  // ==================== CAROUSEL METHODS ====================
  
  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Change slide every 5 seconds
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.carouselPromotions.length;
    this.cdr.detectChanges();
  }

  previousSlide(): void {
    this.currentSlide = this.currentSlide === 0 
      ? this.carouselPromotions.length - 1 
      : this.currentSlide - 1;
    this.cdr.detectChanges();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.stopAutoPlay();
    this.startAutoPlay();
    this.cdr.detectChanges();
  }

  onPromotionClick(promotion: CarouselPromotion): void {
    if (promotion.link_url) {
      window.location.href = promotion.link_url;
    }
  }

  // ==================== CART FUNCTIONALITY ====================
  /**
   * Add product to cart
   */
  addToCart(product: Product): void {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Please login to add items to cart', 'Login Required');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: '/home' } 
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
        console.error('Failed to add to cart:', error);
        if (error.message.includes('Authentication required')) {
          this.toastr.info('Please login to add items to cart', 'Login Required');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: '/home' } 
          });
        } else {
          this.toastr.error('Failed to add product to cart', 'Error');
        }
      }
    });
  }

  // ==================== UI HELPERS ====================
  getStatusClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-success';
      case 'IN_TRANSIT':
        return 'bg-info';
      case 'DISPATCHED':
        return 'bg-primary';
      case 'PLACED':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }


  getCategoryIcon(category: Category): string {
  
  const name = category.name.toLowerCase();
  
  if (name.includes('gadget') || name.includes('phone') || name.includes('electronic')) {
    return 'bi-phone';
  } else if (name.includes('kitchen') || name.includes('appliance')) {
    return 'bi-egg-fried';
  } else if (name.includes('clothes') || name.includes('fashion') || name.includes('wear')) {
    return 'bi-bag';
  } else if (name.includes('vehicle') || name.includes('car') || name.includes('motor')) {
    return 'bi-truck';
  } else if (name.includes('book') || name.includes('education')) {
    return 'bi-book';
  } else if (name.includes('sport') || name.includes('fitness')) {
    return 'bi-bicycle';
  } else if (name.includes('health') || name.includes('beauty')) {
    return 'bi-heart-pulse';
  } else if (name.includes('home') || name.includes('garden')) {
    return 'bi-house';
  } else if (name.includes('toy') || name.includes('game')) {
    return 'bi-controller';
  } else if (name.includes('computer') || name.includes('laptop')) {
    return 'bi-laptop';
  }
  
  // Default icon
  return 'bi-tag';
}


getCategoryProductCount(category: Category): number {
  return this.products.filter(p => p.category === category.id).length;
}
}