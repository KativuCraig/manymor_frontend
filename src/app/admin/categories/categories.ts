import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api, Category } from '../../core/services/api';
import { finalize } from 'rxjs/operators';

interface CategoryWithLevel extends Category {
  level: number;
}

@Component({
  selector: 'app-categories',
  standalone: false,
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories implements OnInit {
  categories: Category[] = [];
  flatCategories: CategoryWithLevel[] = [];
  
  isLoading = true;
  showCategoryModal = false;
  isSaving = false;
  
  categoryForm = {
    name: '',
    parent: null as number | null
  };

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.apiService.getCategories()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.flatCategories = this.flattenCategories(categories);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          alert('Failed to load categories');
        }
      });
  }

  flattenCategories(categories: Category[], level: number = 0): CategoryWithLevel[] {
    let result: CategoryWithLevel[] = [];
    
    categories.forEach(category => {
      result.push({ ...category, level });
      
      if (category.children && category.children.length > 0) {
        result = result.concat(this.flattenCategories(category.children, level + 1));
      }
    });
    
    return result;
  }

  openCreateModal(): void {
    this.resetForm();
    this.showCategoryModal = true;
  }

  closeModal(): void {
    this.showCategoryModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.categoryForm = {
      name: '',
      parent: null
    };
  }

  saveCategory(): void {
    if (!this.categoryForm.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    this.isSaving = true;

    this.apiService.createCategory(this.categoryForm.name, this.categoryForm.parent || undefined)
      .pipe(
        finalize(() => {
          this.isSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadCategories();
          alert('Category created successfully');
        },
        error: (error) => {
          console.error('Error creating category:', error);
          alert('Failed to create category');
        }
      });
  }

  getParentCategories(): Category[] {
    return this.categories.filter(c => !c.parent);
  }

  getCategoryIndent(level: number): string {
    return '—'.repeat(level) + (level > 0 ? ' ' : '');
  }

  countProducts(categoryId: number): number {
    // This would need to be calculated from products data
    return 0;
  }
}
