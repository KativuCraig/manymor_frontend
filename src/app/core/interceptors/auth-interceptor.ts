import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // No refresh-token flow: backend doesn't support refresh tokens yet.

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Force logout on 401 since refresh tokens are not available
          this.authService.logout();
          return throwError(() => error);
        }

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  // Removed refresh-token handling because backend doesn't provide refresh tokens.
  // If a 401 response is received, logout and surface the error.
  // (Kept for clarity if refresh tokens are added later.)
  //
  // Note: No replacement logic required here beyond logging out.
  
}