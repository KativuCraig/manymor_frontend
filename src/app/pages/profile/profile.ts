import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, UserProfile, Address } from '../../core/services/api';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  profile: UserProfile | null = null;
  addresses: Address[] = [];
  isLoading = false;
  
  // Profile edit
  showEditProfileModal = false;
  editProfileForm = {
    phone: ''
  };
  
  // Address modals
  showAddressModal = false;
  addressModalMode: 'create' | 'edit' = 'create';
  selectedAddress: Address | null = null;
  addressForm = {
    label: '',
    city: '',
    address_line: '',
    is_default: false
  };

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    
    this.apiService.getProfile()
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (response) => {
        this.profile = response;
        this.addresses = response.addresses || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        alert('Failed to load profile. Please try again.');
      }
    });
  }

  // Profile Edit
  openEditProfileModal(): void {
    if (this.profile) {
      this.editProfileForm = {
        phone: this.profile.phone || ''
      };
      this.showEditProfileModal = true;
    }
  }

  closeEditProfileModal(): void {
    this.showEditProfileModal = false;
    this.editProfileForm = {
      phone: ''
    };
  }

  saveProfile(): void {
    if (!this.editProfileForm.phone) {
      alert('Phone number is required');
      return;
    }

    this.isLoading = true;
    
    this.apiService.updateProfile(this.editProfileForm)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.profile = response;
          this.addresses = response.addresses || [];
          alert('Profile updated successfully!');
          this.closeEditProfileModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          alert('Failed to update profile. Please try again.');
        }
      });
  }

  // Address Management
  openAddressModal(mode: 'create' | 'edit', address?: Address): void {
    this.addressModalMode = mode;
    
    if (mode === 'edit' && address) {
      this.selectedAddress = address;
      this.addressForm = {
        label: address.label,
        city: address.city,
        address_line: address.address_line,
        is_default: address.is_default
      };
    } else {
      this.selectedAddress = null;
      this.addressForm = {
        label: '',
        city: '',
        address_line: '',
        is_default: false
      };
    }
    
    this.showAddressModal = true;
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    this.addressModalMode = 'create';
    this.selectedAddress = null;
    this.addressForm = {
      label: '',
      city: '',
      address_line: '',
      is_default: false
    };
  }

  saveAddress(): void {
    if (!this.addressForm.label || !this.addressForm.city || !this.addressForm.address_line) {
      alert('All address fields are required');
      return;
    }

    this.isLoading = true;
    
    const request = this.addressModalMode === 'create'
      ? this.apiService.createAddress(this.addressForm)
      : this.apiService.updateAddress(this.selectedAddress!.id, this.addressForm);
    
    request
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          alert(`Address ${this.addressModalMode === 'create' ? 'created' : 'updated'} successfully!`);
          this.closeAddressModal();
          this.loadProfile();
        },
        error: (error) => {
          console.error(`Error ${this.addressModalMode === 'create' ? 'creating' : 'updating'} address:`, error);
          alert(`Failed to ${this.addressModalMode === 'create' ? 'create' : 'update'} address. Please try again.`);
        }
      });
  }

  deleteAddress(addressId: number): void {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    this.isLoading = true;
    
    this.apiService.deleteAddress(addressId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          alert('Address deleted successfully!');
          this.loadProfile();
        },
        error: (error) => {
          console.error('Error deleting address:', error);
          alert('Failed to delete address. Please try again.');
        }
      });
  }

  getDefaultAddress(): Address | null {
    return this.addresses.find(a => a.is_default) || null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
