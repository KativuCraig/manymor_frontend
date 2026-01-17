import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Api, Product } from '../../core/services/api';
import { CartService } from '../../core/services/cart';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-product-detail',
  standalone:false,
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetail implements OnInit {
  product: Product | null = null;
  isLoading = true;
  errorMessage = '';
  quantity = 1;
  currentImageIndex = 0;
  
  // Default images by category
  private defaultImages: { [key: number]: string } = {
    1: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
    2: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
    3: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
    4: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: Api,
    private cartService: CartService,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log(' Product Detail: Initializing...');
    this.loadProduct();
  }

  loadProduct(): void {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      
      if (!productId) {
        this.errorMessage = 'Product ID not provided';
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }
      
      console.log(` Loading product ID: ${productId}`);
      this.fetchProduct(parseInt(productId));
    });
  }

  fetchProduct(productId: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.apiService.getProduct(productId).subscribe({
      next: (product) => {
        console.log(' Product loaded:', product);
        
        this.product = product;
        
        // Ensure images array exists
        if (!product.images) {
          product.images = [];
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(' Error loading product:', error);
        
        if (error.status === 404) {
          this.errorMessage = 'Product not found';
          this.toastr.error('Product not found', 'Error');
        } else {
          this.errorMessage = 'Failed to load product details. Please try again.';
          this.toastr.error('Failed to load product', 'Error');
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getCategoryPlaceholderImage(categoryId: number): string {
    return this.defaultImages[categoryId] || 
           'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';
  }

  getStockAlertClass(): string {
    if (!this.product) return 'alert-secondary';
    
    if (this.product.stock_quantity === 0) {
      return 'alert-danger';
    } else if (this.product.stock_quantity < 10) {
      return 'alert-warning';
    } else {
      return 'alert-success';
    }
  }

  showImage(index: number): void {
    this.currentImageIndex = index;
    
    // Update carousel to show selected image
    const carousel = document.getElementById('productCarousel');
    if (carousel) {
      // This would normally use Bootstrap carousel API
      // For simplicity, we'll just update the active class
      const carouselInstance = (window as any).bootstrap.Carousel.getInstance(carousel);
      if (carouselInstance) {
        carouselInstance.to(index);
      }
    }
  }

  increaseQuantity(): void {
    if (this.product && this.quantity < this.product.stock_quantity) {
      this.quantity++;
      this.cdr.detectChanges();
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.detectChanges();
    }
  }

  addToCart(): void {
    if (!this.product) return;

    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Please login to add items to cart', 'Login Required');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (this.product.stock_quantity === 0) {
      this.toastr.warning('This product is out of stock!', 'Stock Alert');
      return;
    }

    if (this.quantity > this.product.stock_quantity) {
      this.toastr.warning(`Only ${this.product.stock_quantity} units available`, 'Stock Limit');
      return;
    }

    this.cartService.addToCart(this.product.id, this.quantity).subscribe({
      next: (cart) => {
        this.toastr.success(`${this.product!.name} (${this.quantity}) added to cart!`, 'Success');
        this.quantity = 1; // Reset quantity
        this.cdr.detectChanges();
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

  buyNow(): void {
    if (!this.product) return;

    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Please login to continue shopping', 'Login Required');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (this.product.stock_quantity === 0) {
      this.toastr.warning('This product is out of stock!', 'Stock Alert');
      return;
    }

    if (this.quantity > this.product.stock_quantity) {
      this.toastr.warning(`Only ${this.product.stock_quantity} units available`, 'Stock Limit');
      return;
    }

    // Add to cart and navigate to checkout
    this.cartService.addToCart(this.product.id, this.quantity).subscribe({
      next: (cart) => {
        this.toastr.success(`Added ${this.product!.name} to cart!`, 'Success');
        this.router.navigate(['/cart']);
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
        if (error.message.includes('Authentication required')) {
          this.toastr.info('Please login to continue shopping', 'Login Required');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: this.router.url } 
          });
        } else {
          this.toastr.error('Failed to add product to cart', 'Error');
        }
      }
    });
  }
}