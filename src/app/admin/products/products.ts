import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, Product, Category } from '../../core/services/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  filteredProducts: Product[] = [];
  
  isLoading = true;
  showProductModal = false;
  isEditMode = false;
  isSaving = false;
  
  selectedProduct: Product | null = null;
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  searchTerm = '';
  selectedCategory: number | null = null;
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' = 'all';
  
  productForm = {
    name: '',
    description: '',
    price: 0,
    stock_quantity: 0,
    is_active: true,
    category: 0
  };

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    forkJoin({
      products: this.apiService.getProducts(),
      categories: this.apiService.getCategories()
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (response) => {
        this.products = response.products;
        this.categories = response.categories;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading data:', error);
        alert('Failed to load products and categories');
      }
    });
  }

  loadProducts(): void {
    this.loadData();
  }

  applyFilters(): void {
    let filtered = [...this.products];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // Stock filter
    if (this.stockFilter !== 'all') {
      if (this.stockFilter === 'out_of_stock') {
        filtered = filtered.filter(p => p.stock_quantity === 0);
      } else if (this.stockFilter === 'low_stock') {
        filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10);
      } else if (this.stockFilter === 'in_stock') {
        filtered = filtered.filter(p => p.stock_quantity > 10);
      }
    }

    this.filteredProducts = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onStockFilterChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedProduct = null;
    this.resetForm();
    this.showProductModal = true;
  }

  openEditModal(product: Product): void {
    this.isEditMode = true;
    this.selectedProduct = product;
    this.productForm = {
      name: product.name,
      description: product.description,
      price: product.price,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
      category: product.category
    };
    this.showProductModal = true;
  }

  closeModal(): void {
    this.showProductModal = false;
    this.resetForm();
    this.clearImageSelection();
  }

  resetForm(): void {
    this.productForm = {
      name: '',
      description: '',
      price: 0,
      stock_quantity: 0,
      is_active: true,
      category: 0
    };
    this.clearImageSelection();
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImages = Array.from(input.files);
      
      // Generate preview URLs
      this.imagePreviewUrls = [];
      this.selectedImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeImagePreview(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  clearImageSelection(): void {
    this.selectedImages = [];
    this.imagePreviewUrls = [];
  }

  saveProduct(): void {
    if (!this.productForm.name || !this.productForm.category || this.productForm.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSaving = true;

    const operation = this.isEditMode && this.selectedProduct
      ? this.apiService.updateProduct(this.selectedProduct.id, this.productForm, this.selectedImages)
      : this.apiService.createProduct(this.productForm, this.selectedImages);

    operation.pipe(
      finalize(() => {
        this.isSaving = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (product) => {
        this.closeModal();
        this.loadData();
        alert(this.isEditMode ? 'Product updated successfully' : 'Product created successfully');
      },
      error: (error) => {
        console.error('Error saving product:', error);
        alert('Failed to save product');
      }
    });
  }

  toggleProductStatus(product: Product): void {
    const newStatus = !product.is_active;
    this.apiService.updateProduct(product.id, { is_active: newStatus })
      .pipe(
        finalize(() => this.cdr.detectChanges())
      )
      .subscribe({
        next: () => {
          product.is_active = newStatus;
          this.cdr.detectChanges();
          alert(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
        },
        error: (error) => {
          console.error('Error updating product status:', error);
          alert('Failed to update product status');
        }
      });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    this.apiService.deleteProduct(product.id)
      .pipe(
        finalize(() => this.cdr.detectChanges())
      )
      .subscribe({
        next: () => {
          this.loadData();
          alert('Product deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          alert('Failed to delete product');
        }
      });
  }

  getStockStatusClass(quantity: number): string {
    if (quantity === 0) return 'text-danger';
    if (quantity <= 10) return 'text-warning';
    return 'text-success';
  }

  getStockStatusText(quantity: number): string {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= 10) return 'Low Stock';
    return 'In Stock';
  }

  getProductImage(product: Product): string {
    return product.images && product.images.length > 0 
      ? product.images[0].image 
      : 'assets/placeholder.png';
  }
}
