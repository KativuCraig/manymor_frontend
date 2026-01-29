import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl: string = '/';
  requires2FA = false; // Flag to show 2FA input field
  twoFactorCode = ''; // Store 2FA code

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const { email, password } = this.loginForm.value;

    // Pass 2FA code if provided
    this.authService.login(email, password, this.twoFactorCode || undefined).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Redirect based on role, but respect returnUrl if provided
        if (response.user.role === 'ADMIN' && this.returnUrl === '/') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        // Check if 2FA is required
        if (error.status === 400 && error.error?.message?.includes('2FA') || 
            error.error?.message?.includes('two-factor') ||
            error.error?.requires_2fa) {
          this.requires2FA = true;
          this.errorMessage = 'Please enter your 6-digit authentication code';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
          this.requires2FA = false;
          this.twoFactorCode = '';
        }
        this.cdr.detectChanges();
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}