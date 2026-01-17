import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { CartService } from '../../core/services/cart';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit, OnDestroy {
  searchQuery = '';
  showMobileSearch = false;
  cartItemCount = 0;
  
  private cartSubscription!: Subscription;
  private authSubscription!: Subscription;
  private lastCartCount = 0;

  constructor(
    public authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to cart updates with distinctUntilChanged to prevent unnecessary updates
    this.cartSubscription = this.cartService.cart$
      .pipe(distinctUntilChanged((prev, curr) => {
        const prevCount = prev ? prev.items.reduce((total, item) => total + item.quantity, 0) : 0;
        const currCount = curr ? curr.items.reduce((total, item) => total + item.quantity, 0) : 0;
        return prevCount === currCount;
      }))
      .subscribe(cart => {
        const newCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        
        // Only update if count actually changed
        if (this.lastCartCount !== newCount) {
          this.lastCartCount = newCount;
          this.cartItemCount = newCount;
          
          // Run change detection
          this.cdr.detectChanges();
          console.log('Header cart count updated:', this.cartItemCount);
        }
      });

    // Subscribe to auth changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.cartService.refreshCart();
      } else {
        this.cartItemCount = 0;
        this.lastCartCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
      this.searchQuery = '';
      this.showMobileSearch = false;
    }
  }

  toggleMobileSearch(): void {
    this.showMobileSearch = !this.showMobileSearch;
  }

  onLogout(): void {
    this.authService.logout();
  }
}