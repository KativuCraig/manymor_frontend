import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-two-factor',
  standalone: false,
  templateUrl: './two-factor.html',
  styleUrls: ['./two-factor.css']
})
export class TwoFactor implements OnInit {
  // State
  isEnabled = false;
  isLoading = true;
  isProcessing = false;

  // Setup state
  showSetup = false;
  qrCodeUrl = '';
  secret = '';
  verificationCode = '';

  // Backup codes
  backupCodes: string[] = [];
  showBackupCodes = false;

  // Disable form
  disableForm: FormGroup;
  showDisableForm = false;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.disableForm = this.fb.group({
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.check2FAStatus();
  }

  /**
   * Check if 2FA is enabled
   */
  check2FAStatus(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.get2FAStatus().subscribe({
      next: (response) => {
        this.isEnabled = response.is_enabled;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error checking 2FA status:', error);
        this.toastr.error('Failed to check 2FA status', 'Error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Start 2FA setup process
   */
  startSetup(): void {
    this.isProcessing = true;
    this.cdr.detectChanges();

    this.authService.setup2FA().subscribe({
      next: (response) => {
        this.qrCodeUrl = response.qr_code;
        this.secret = response.secret;
        this.showSetup = true;
        this.isProcessing = false;
        this.cdr.detectChanges();
        this.toastr.info('Scan the QR code with your authenticator app', 'Setup 2FA');
      },
      error: (error) => {
        console.error('Error setting up 2FA:', error);
        this.toastr.error('Failed to setup 2FA', 'Error');
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Verify code and enable 2FA
   */
  verifyAndEnable(): void {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.toastr.warning('Please enter a valid 6-digit code', 'Invalid Code');
      return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();

    this.authService.verify2FA(this.verificationCode).subscribe({
      next: (response) => {
        this.backupCodes = response.backup_codes;
        this.showBackupCodes = true;
        this.showSetup = false;
        this.isEnabled = true;
        this.isProcessing = false;
        this.verificationCode = '';
        this.cdr.detectChanges();
        this.toastr.success('2FA enabled successfully!', 'Success');
      },
      error: (error) => {
        console.error('Error verifying 2FA:', error);
        this.toastr.error(error.error?.message || 'Invalid verification code', 'Error');
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cancel setup
   */
  cancelSetup(): void {
    this.showSetup = false;
    this.qrCodeUrl = '';
    this.secret = '';
    this.verificationCode = '';
    this.cdr.detectChanges();
  }

  /**
   * Show disable form
   */
  showDisable(): void {
    this.showDisableForm = true;
    this.cdr.detectChanges();
  }

  /**
   * Disable 2FA
   */
  disable2FA(): void {
    if (this.disableForm.invalid) {
      this.toastr.warning('Please enter your password', 'Required');
      return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();

    const password = this.disableForm.value.password;

    this.authService.disable2FA(password).subscribe({
      next: (response) => {
        this.isEnabled = false;
        this.showDisableForm = false;
        this.disableForm.reset();
        this.isProcessing = false;
        this.cdr.detectChanges();
        this.toastr.success('2FA disabled successfully', 'Success');
      },
      error: (error) => {
        console.error('Error disabling 2FA:', error);
        this.toastr.error(error.error?.message || 'Failed to disable 2FA', 'Error');
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cancel disable
   */
  cancelDisable(): void {
    this.showDisableForm = false;
    this.disableForm.reset();
    this.cdr.detectChanges();
  }

  /**
   * Close backup codes modal
   */
  closeBackupCodes(): void {
    this.showBackupCodes = false;
    this.backupCodes = [];
    this.cdr.detectChanges();
  }

  /**
   * Copy backup codes
   */
  copyBackupCodes(): void {
    const codes = this.backupCodes.join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      this.toastr.success('Backup codes copied to clipboard', 'Success');
    });
  }

  /**
   * Download backup codes
   */
  downloadBackupCodes(): void {
    const codes = this.backupCodes.join('\n');
    const blob = new Blob([codes], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manymor-2fa-backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('Backup codes downloaded', 'Success');
  }
}
