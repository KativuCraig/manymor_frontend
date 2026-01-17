import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, User } from '../../core/services/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-customers',
  standalone: false,
  templateUrl: './customers.html',
  styleUrls: ['./customers.css']
})
export class Customers implements OnInit {
  customers: User[] = [];
  filteredCustomers: User[] = [];
  isLoading = false;
  
  // Filters
  searchTerm = '';
  filterRole: 'ALL' | 'ADMIN' | 'CUSTOMER' = 'ALL';
  filterStatus: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  
  // Edit modal
  showEditModal = false;
  selectedCustomer: User | null = null;
  editForm = {
    role: '' as 'ADMIN' | 'CUSTOMER'
  };
  
  // View details modal
  showDetailsModal = false;
  detailsCustomer: User | null = null;

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading = true;
    
    this.apiService.getCustomers()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (customers) => {
          this.customers = customers;
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          alert('Failed to load customers. Please try again.');
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.customers];
    
    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.email.toLowerCase().includes(term) ||
        c.first_name?.toLowerCase().includes(term) ||
        c.last_name?.toLowerCase().includes(term) ||
        c.phone_number?.toLowerCase().includes(term)
      );
    }
    
    // Role filter
    if (this.filterRole !== 'ALL') {
      filtered = filtered.filter(c => c.role === this.filterRole);
    }
    
    // Status filter
    if (this.filterStatus !== 'ALL') {
      const isActive = this.filterStatus === 'ACTIVE';
      filtered = filtered.filter(c => c.is_active === isActive);
    }
    
    this.filteredCustomers = filtered;
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterRole = 'ALL';
    this.filterStatus = 'ALL';
    this.applyFilters();
  }

  openEditModal(customer: User): void {
    this.selectedCustomer = customer;
    this.editForm.role = customer.role;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCustomer = null;
    this.editForm.role = '' as any;
  }

  saveCustomerRole(): void {
    if (!this.selectedCustomer || !this.editForm.role) {
      alert('Please select a role');
      return;
    }

    this.isLoading = true;
    
    this.apiService.updateUserRole(this.selectedCustomer.id, this.editForm.role)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          alert('Customer role updated successfully!');
          this.closeEditModal();
          this.loadCustomers();
        },
        error: (error) => {
          console.error('Error updating customer role:', error);
          alert('Failed to update customer role. Please try again.');
        }
      });
  }

  openDetailsModal(customer: User): void {
    this.detailsCustomer = customer;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.detailsCustomer = null;
  }

  getCustomerName(customer: User): string {
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-success' : 'bg-danger';
  }

  getRoleBadgeClass(role: string): string {
    return role === 'ADMIN' ? 'bg-danger' : 'bg-info';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
