import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PromotionService } from '../../core/services/promotion.service';
import { Api, Product } from '../../core/services/api';
import { CarouselPromotion, ProductPromotion, PromotionStats } from '../../core/models/promotion.model';

declare var bootstrap: any;

@Component({
  selector: 'app-promotions',
  standalone: false,
  templateUrl: './promotions.html',
  styleUrls: ['./promotions.css']
})
export class Promotions implements OnInit {
  
  // ==================== DATA ====================
  carouselPromotions: CarouselPromotion[] = [];
  productPromotions: ProductPromotion[] = [];
  products: Product[] = [];
  stats: PromotionStats | null = null;
  
  // ==================== ACTIVE TAB ====================
  activeTab: 'carousel' | 'product' | 'stats' = 'stats';
  
  // ==================== LOADING STATES ====================
  isLoadingCarousel = false;
  isLoadingProduct = false;
  isLoadingStats = false;
  isLoadingProducts = false;
  
  // ==================== FILTERS ====================
  showActiveOnly = false;
  searchTerm = '';
  
  // ==================== FORM DATA ====================
  carouselForm: Partial<CarouselPromotion> = this.getEmptyCarouselForm();
  productForm: Partial<ProductPromotion> = this.getEmptyProductForm();
  selectedImage: File | null = null;
  selectedProductIds: number[] = [];
  
  // ==================== EDIT MODE ====================
  editingCarouselId: number | null = null;
  editingProductId: number | null = null;
  
  constructor(
    private promotionService: PromotionService,
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.loadStats();
    this.loadProducts();
  }
  
  // ==================== TAB SWITCHING ====================
  
  switchTab(tab: 'carousel' | 'product' | 'stats'): void {
    this.activeTab = tab;
    
    if (tab === 'carousel' && this.carouselPromotions.length === 0) {
      this.loadCarouselPromotions();
    } else if (tab === 'product' && this.productPromotions.length === 0) {
      this.loadProductPromotions();
    } else if (tab === 'stats' && !this.stats) {
      this.loadStats();
    }
  }
  
  // ==================== LOAD DATA ====================
  
  loadStats(): void {
    this.isLoadingStats = true;
    this.promotionService.getPromotionStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading promotion stats:', error);
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  loadCarouselPromotions(): void {
    this.isLoadingCarousel = true;
    this.promotionService.getAllCarouselPromotions(this.showActiveOnly).subscribe({
      next: (promotions) => {
        this.carouselPromotions = promotions.sort((a, b) => a.display_order - b.display_order);
        this.isLoadingCarousel = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading carousel promotions:', error);
        this.isLoadingCarousel = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  loadProductPromotions(): void {
    this.isLoadingProduct = true;
    this.promotionService.getAllProductPromotions(this.showActiveOnly).subscribe({
      next: (promotions) => {
        this.productPromotions = promotions;
        this.isLoadingProduct = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading product promotions:', error);
        this.isLoadingProduct = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  loadProducts(): void {
    this.isLoadingProducts = true;
    this.api.getProducts().subscribe({
      next: (products) => {
        this.products = Array.isArray(products) ? products : [];
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  // ==================== CAROUSEL PROMOTIONS CRUD ====================
  
  openCarouselModal(promotion?: CarouselPromotion): void {
    if (promotion) {
      this.editingCarouselId = promotion.id || null;
      this.carouselForm = { ...promotion };
    } else {
      this.editingCarouselId = null;
      this.carouselForm = this.getEmptyCarouselForm();
    }
    this.selectedImage = null;
    
    const modalElement = document.getElementById('carouselModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
  
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
    }
  }
  
  saveCarouselPromotion(): void {
    const formData = new FormData();
    
    formData.append('title', this.carouselForm.title || '');
    formData.append('description', this.carouselForm.description || '');
    formData.append('button_text', this.carouselForm.button_text || '');
    formData.append('link_url', this.carouselForm.link_url || '');
    formData.append('display_order', String(this.carouselForm.display_order || 0));
    formData.append('is_active', String(this.carouselForm.is_active || false));
    formData.append('start_date', this.carouselForm.start_date || '');
    formData.append('end_date', this.carouselForm.end_date || '');
    
    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }
    
    const operation = this.editingCarouselId
      ? this.promotionService.updateCarouselPromotion(this.editingCarouselId, formData)
      : this.promotionService.createCarouselPromotion(formData);
    
    operation.subscribe({
      next: () => {
        this.loadCarouselPromotions();
        this.loadStats();
        this.closeModal('carouselModal');
        alert(this.editingCarouselId ? 'Carousel updated successfully!' : 'Carousel created successfully!');
      },
      error: (error) => {
        console.error('Error saving carousel promotion:', error);
        alert('Failed to save carousel promotion. Please try again.');
      }
    });
  }
  
  deleteCarouselPromotion(id: number): void {
    if (confirm('Are you sure you want to delete this carousel promotion?')) {
      this.promotionService.deleteCarouselPromotion(id).subscribe({
        next: () => {
          this.loadCarouselPromotions();
          this.loadStats();
          alert('Carousel promotion deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting carousel promotion:', error);
          alert('Failed to delete carousel promotion.');
        }
      });
    }
  }
  
  // ==================== PRODUCT PROMOTIONS CRUD ====================
  
  openProductModal(promotion?: ProductPromotion): void {
    if (promotion) {
      this.editingProductId = promotion.id || null;
      this.productForm = { ...promotion };
      this.selectedProductIds = promotion.products || [];
    } else {
      this.editingProductId = null;
      this.productForm = this.getEmptyProductForm();
      this.selectedProductIds = [];
    }
    
    const modalElement = document.getElementById('productModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
  
  toggleProductSelection(productId: number): void {
    const index = this.selectedProductIds.indexOf(productId);
    if (index > -1) {
      this.selectedProductIds.splice(index, 1);
    } else {
      this.selectedProductIds.push(productId);
    }
  }
  
  isProductSelected(productId: number): boolean {
    return this.selectedProductIds.includes(productId);
  }
  
  saveProductPromotion(): void {
    const promotion: Partial<ProductPromotion> = {
      name: this.productForm.name,
      description: this.productForm.description,
      discount_type: this.productForm.discount_type,
      discount_value: this.productForm.discount_value,
      badge_text: this.productForm.badge_text,
      badge_color: this.productForm.badge_color,
      is_active: this.productForm.is_active,
      start_date: this.productForm.start_date,
      end_date: this.productForm.end_date,
      products: this.selectedProductIds
    };
    
    const operation = this.editingProductId
      ? this.promotionService.updateProductPromotion(this.editingProductId, promotion)
      : this.promotionService.createProductPromotion(promotion);
    
    operation.subscribe({
      next: () => {
        this.loadProductPromotions();
        this.loadStats();
        this.closeModal('productModal');
        alert(this.editingProductId ? 'Promotion updated successfully!' : 'Promotion created successfully!');
      },
      error: (error) => {
        console.error('Error saving product promotion:', error);
        alert('Failed to save product promotion. Please try again.');
      }
    });
  }
  
  deleteProductPromotion(id: number): void {
    if (confirm('Are you sure you want to delete this product promotion?')) {
      this.promotionService.deleteProductPromotion(id).subscribe({
        next: () => {
          this.loadProductPromotions();
          this.loadStats();
          alert('Product promotion deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting product promotion:', error);
          alert('Failed to delete product promotion.');
        }
      });
    }
  }
  
  // ==================== UTILITIES ====================
  
  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }
  
  getEmptyCarouselForm(): Partial<CarouselPromotion> {
    return {
      title: '',
      description: '',
      button_text: 'Shop Now',
      link_url: '',
      display_order: 0,
      is_active: true,
      start_date: '',
      end_date: '',
      image: ''
    };
  }
  
  getEmptyProductForm(): Partial<ProductPromotion> {
    return {
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      badge_text: 'SALE',
      badge_color: '#FF0000',
      is_active: true,
      start_date: '',
      end_date: '',
      products: []
    };
  }
  
  get filteredCarouselPromotions(): CarouselPromotion[] {
    if (!this.searchTerm) return this.carouselPromotions;
    
    const term = this.searchTerm.toLowerCase();
    return this.carouselPromotions.filter(p => 
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }
  
  get filteredProductPromotions(): ProductPromotion[] {
    if (!this.searchTerm) return this.productPromotions;
    
    const term = this.searchTerm.toLowerCase();
    return this.productPromotions.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }
  
  get filteredProducts(): Product[] {
    if (!this.searchTerm) return this.products;
    
    const term = this.searchTerm.toLowerCase();
    return this.products.filter(p => 
      p.name.toLowerCase().includes(term)
    );
  }
  
  onFilterChange(): void {
    if (this.activeTab === 'carousel') {
      this.loadCarouselPromotions();
    } else if (this.activeTab === 'product') {
      this.loadProductPromotions();
    }
  }
}
