import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CartService } from '../../core/services/cart';
import { Cart, CartItem } from '../../core/services/api';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  isLoading = true;
  isUpdating = false;
  
  // Track which items are being updated
  updatingItems: Set<number> = new Set();
  
  // Default image
  private defaultProductImage = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80';

  constructor(
    private cartService: CartService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Cart: Initializing...');
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.cartService.cart$.subscribe({
      next: (cart) => {
        console.log('Cart loaded:', cart);
        this.cart = cart;
        this.isLoading = false;
        this.updatingItems.clear();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.isLoading = false;
        this.updatingItems.clear();
        this.cdr.detectChanges();
        this.toastr.error('Failed to load cart', 'Error');
      }
    });
  }

  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0].image;
    }
    return this.defaultProductImage;
  }

  getStockBadgeClass(product: any): string {
    if (product.stock_quantity === 0) {
      return 'bg-danger';
    } else if (product.stock_quantity < 10) {
      return 'bg-warning text-dark';
    } else {
      return 'bg-success';
    }
  }

  getStockStatus(product: any): string {
    if (product.stock_quantity === 0) {
      return 'Out of Stock';
    } else if (product.stock_quantity < 10) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }

  validateQuantity(item: CartItem): void {
    console.log('Validating quantity for item:', item.id, 'current:', item.quantity);
    
    if (item.quantity < 1) {
      item.quantity = 1;
    }
    
    if (item.quantity > item.product.stock_quantity) {
      item.quantity = item.product.stock_quantity;
      this.toastr.warning(`Only ${item.product.stock_quantity} units available`, 'Stock Limit');
    }
    
    // Update cart if quantity changed
    this.updateQuantity(item, item.quantity);
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    console.log(`Updating item ${item.id} from ${item.quantity} to ${newQuantity}`);
    
    // Check if already updating this item
    if (this.updatingItems.has(item.id)) {
      console.log('Item is already being updated');
      return;
    }
    
    if (newQuantity < 1 || newQuantity > item.product.stock_quantity) {
      console.log('Invalid quantity');
      return;
    }
    
    if (newQuantity === item.quantity) {
      console.log('No change in quantity');
      return; // No change
    }
    
    // Mark item as updating
    this.updatingItems.add(item.id);
    this.isUpdating = true;
    
    // Update the UI immediately for better UX
    const oldQuantity = item.quantity;
    item.quantity = newQuantity;
    this.cdr.detectChanges();
    
    this.cartService.updateQuantity(item.id, newQuantity).subscribe({
      next: (cart) => {
        console.log('Quantity updated successfully');
        this.cart = cart;
        this.isUpdating = false;
        this.updatingItems.delete(item.id);
        this.cdr.detectChanges();
        this.toastr.success('Cart updated', 'Success');
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        
        // Revert the UI change on error
        item.quantity = oldQuantity;
        
        this.isUpdating = false;
        this.updatingItems.delete(item.id);
        this.cdr.detectChanges();
        this.toastr.error('Failed to update cart', 'Error');
      }
    });
  }

  removeItem(item: CartItem): void {
    console.log(`Removing item ${item.id}`);
    
    if (this.updatingItems.has(item.id)) {
      console.log('Item is already being updated');
      return;
    }
    
    this.updatingItems.add(item.id);
    this.isUpdating = true;
    this.cdr.detectChanges();
    
    this.cartService.removeItem(item.id).subscribe({
      next: (cart) => {
        console.log('Item removed successfully');
        this.cart = cart;
        this.isUpdating = false;
        this.updatingItems.delete(item.id);
        this.cdr.detectChanges();
        this.toastr.success('Item removed from cart', 'Success');
      },
      error: (error) => {
        console.error('Error removing item:', error);
        this.isUpdating = false;
        this.updatingItems.delete(item.id);
        this.cdr.detectChanges();
        this.toastr.error('Failed to remove item', 'Error');
      }
    });
  }

  clearCart(): void {
    if (!this.cart || this.cart.items.length === 0) {
      return;
    }
    
    if (!confirm('Are you sure you want to clear your entire cart?')) {
      return;
    }
    
    this.isUpdating = true;
    this.cdr.detectChanges();
    
    // Mark all items as updating
    this.cart.items.forEach(item => this.updatingItems.add(item.id));
    
    // Remove all items one by one
    const removePromises = this.cart.items.map(item => 
      this.cartService.removeItem(item.id).toPromise()
    );
    
    Promise.all(removePromises).then(() => {
      console.log('Cart cleared successfully');
      this.isUpdating = false;
      this.updatingItems.clear();
      this.cdr.detectChanges();
      this.toastr.success('Cart cleared', 'Success');
    }).catch(error => {
      console.error('Error clearing cart:', error);
      this.isUpdating = false;
      this.updatingItems.clear();
      this.cdr.detectChanges();
      this.toastr.error('Failed to clear cart', 'Error');
    });
  }

  getSubtotal(): number {
    if (!this.cart) return 0;
    
    return this.cart.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }

  getTotal(): number {
    return this.getSubtotal();
  }

  hasOutOfStockItems(): boolean {
    if (!this.cart) return false;
    
    return this.cart.items.some(item => item.product.stock_quantity === 0);
  }

  hasLowStockItems(): boolean {
    if (!this.cart) return false;
    
    return this.cart.items.some(item => 
      item.product.stock_quantity > 0 && item.product.stock_quantity < 10
    );
  }

  isCartValid(): boolean {
    if (!this.cart || this.cart.items.length === 0) {
      return false;
    }
    
    // Check if any items are out of stock
    if (this.hasOutOfStockItems()) {
      return false;
    }
    
    // Check if any items have quantity exceeding stock
    const hasInvalidQuantity = this.cart.items.some(item => 
      item.quantity > item.product.stock_quantity
    );
    
    return !hasInvalidQuantity;
  }

  proceedToCheckout(): void {
    if (!this.isCartValid()) {
      this.toastr.warning('Please fix cart issues before checkout', 'Cart Issues');
      return;
    }
    
    this.router.navigate(['/checkout']);
  }
}