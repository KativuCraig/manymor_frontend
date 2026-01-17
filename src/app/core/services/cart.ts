import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Api, Cart, CartItem } from './api';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  cart$ = this.cartSubject.asObservable();
  private isLoading = false;

  constructor(
    private apiService: Api,
    private authService: AuthService
  ) {
    // Only load cart if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.loadCart();
    }

    // Subscribe to auth changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // User logged in - load cart
        this.loadCart();
      } else {
        // User logged out - clear cart
        this.clearCart();
      }
    });
  }

  // Load cart from API (requires authentication)
  loadCart(): void {
    if (this.isLoading) return;
    
    // Don't attempt to load cart if not authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('Cannot load cart: User not authenticated');
      this.cartSubject.next(null);
      return;
    }
    
    this.isLoading = true;
    this.apiService.getCart().subscribe({
      next: (cart) => {
        this.cartSubject.next(cart);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.cartSubject.next(null);
        this.isLoading = false;
      }
    });
  }

  // Get current cart
  getCart(): Cart | null {
    return this.cartSubject.value;
  }

  // Get total items count
  getTotalItems(): number {
    const cart = this.cartSubject.value;
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  // Add item to cart (requires authentication)
  addToCart(productId: number, quantity: number = 1): Observable<Cart> {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.error('Cannot add to cart: User not authenticated');
      return throwError(() => new Error('Authentication required to add items to cart'));
    }

    return this.apiService.addToCart(productId, quantity).pipe(
      tap(cart => {
        console.log('Cart updated after add:', cart);
        this.cartSubject.next(cart);
      }),
      catchError(error => {
        console.error('Error adding to cart:', error);
        throw error;
      })
    );
  }

  // Update cart item quantity (requires authentication)
  updateQuantity(itemId: number, quantity: number): Observable<Cart> {
    console.log(`Updating item ${itemId} to quantity ${quantity}`);
    
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Authentication required'));
    }
    
    if (quantity < 1) {
      console.log('Quantity less than 1, removing item');
      return this.removeItem(itemId);
    }
    
    return this.apiService.updateCartItem(itemId, quantity).pipe(
      tap(cart => {
        console.log('Cart updated after quantity change:', cart);
        this.cartSubject.next(cart);
      }),
      catchError(error => {
        console.error('Error updating quantity:', error);
        throw error;
      })
    );
  }

  // Remove item from cart (requires authentication)
  removeItem(itemId: number): Observable<Cart> {
    console.log(`Removing item ${itemId}`);
    
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Authentication required'));
    }
    
    return this.apiService.removeCartItem(itemId).pipe(
      tap(cart => {
        console.log('Cart updated after removal:', cart);
        this.cartSubject.next(cart);
      }),
      catchError(error => {
        console.error('Error removing item:', error);
        throw error;
      })
    );
  }

  // Clear cart (after checkout)
  clearCart(): void {
    console.log('Clearing cart');
    this.cartSubject.next(null);
  }

  // Check if product is in cart
  isInCart(productId: number): boolean {
    const cart = this.cartSubject.value;
    if (!cart) return false;
    
    return cart.items.some(item => item.product.id === productId);
  }

  // Get item quantity for a product
  getItemQuantity(productId: number): number {
    const cart = this.cartSubject.value;
    if (!cart) return 0;
    
    const item = cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  // Refresh cart from server (requires authentication)
  refreshCart(): void {
    console.log('Refreshing cart from server');
    if (this.authService.isAuthenticated()) {
      this.loadCart();
    } else {
      console.log('Cannot refresh cart: User not authenticated');
      this.cartSubject.next(null);
    }
  }

  // Force cart update (for debugging)
  forceCartUpdate(cart: Cart | null): void {
    console.log('Force updating cart:', cart);
    this.cartSubject.next(cart);
  }

  proceedToCheckout(): void {
  // This will be called from cart component
  console.log('Proceeding to checkout...');
}
}