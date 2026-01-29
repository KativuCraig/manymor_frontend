import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Api, User, AuthResponse } from './api';
import { 
  TwoFactorSetupResponse, 
  TwoFactorVerifyResponse, 
  TwoFactorStatusResponse, 
  TwoFactorDisableRequest 
} from '../models/api-responses';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: Api,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  // Login (with optional 2FA code)
  login(email: string, password: string, twoFactorCode?: string): Observable<AuthResponse> {
    return this.apiService.login(email, password, twoFactorCode)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  // Register
  register(email: string, password: string, phone?: string): Observable<AuthResponse> {
    return this.apiService.register(email, password, phone)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  // Get current user from API
  fetchCurrentUser(): Observable<User> {
    return this.apiService.getCurrentUser()
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          if (this.hasLocalStorage()) {
            localStorage.setItem('user', JSON.stringify(user));
          }
        })
      );
  }

  // Logout
  logout(): void {
    if (this.hasLocalStorage()) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Get access token
  getToken(): string | null {
    return this.hasLocalStorage() ? localStorage.getItem('access_token') : null;
  }

  // refreshToken(): import('rxjs').Observable<any> {
  //   const refresh = this.getRefreshToken();
  //   return this.http.post<any>('/api/auth/refresh', { refresh });
  // }

  // Get refresh token
  getRefreshToken(): string | null {
    return this.hasLocalStorage() ? localStorage.getItem('refresh_token') : null;
  }

  // Private methods
  private setSession(authResult: AuthResponse): void {
    if (this.hasLocalStorage()) {
      localStorage.setItem('access_token', authResult.access);
      localStorage.setItem('refresh_token', authResult.refresh);
      localStorage.setItem('user', JSON.stringify(authResult.user));
    }
    this.currentUserSubject.next(authResult.user);
  }

  private loadUserFromStorage(): void {
    if (!this.hasLocalStorage()) {
      return;
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch {
        // ignore malformed stored user
      }
    }
  }

  private hasLocalStorage(): boolean {
    return (typeof localStorage !== 'undefined');
  }

  // ==================== 2FA METHODS ====================
  
  /**
   * Setup 2FA - Generate QR code
   */
  setup2FA(): Observable<TwoFactorSetupResponse> {
    return this.apiService.setup2FA();
  }

  /**
   * Verify 2FA code and enable 2FA
   */
  verify2FA(code: string): Observable<TwoFactorVerifyResponse> {
    return this.apiService.verify2FA(code);
  }

  /**
   * Disable 2FA
   */
  disable2FA(password: string): Observable<{ message: string }> {
    return this.apiService.disable2FA({ password });
  }

  /**
   * Check 2FA status
   */
  get2FAStatus(): Observable<TwoFactorStatusResponse> {
    return this.apiService.get2FAStatus();
  }
}