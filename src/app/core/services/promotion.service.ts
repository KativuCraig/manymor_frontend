import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CarouselPromotion, ProductPromotion, PromotionStats } from '../models/promotion.model';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  // ==================== CAROUSEL PROMOTIONS ====================
  
  getActiveCarouselPromotions(): Observable<CarouselPromotion[]> {
    return this.http.get<CarouselPromotion[]>(
      `${this.apiUrl}/promotions/carousel-promotions/active/`
    );
  }

  getAllCarouselPromotions(activeOnly: boolean = false): Observable<CarouselPromotion[]> {
    const url = activeOnly 
      ? `${this.apiUrl}/promotions/carousel-promotions/?active_only=true`
      : `${this.apiUrl}/promotions/carousel-promotions/`;
    return this.http.get<CarouselPromotion[]>(url);
  }

  getCarouselPromotion(id: number): Observable<CarouselPromotion> {
    return this.http.get<CarouselPromotion>(
      `${this.apiUrl}/promotions/carousel-promotions/${id}/`
    );
  }

  createCarouselPromotion(data: FormData): Observable<CarouselPromotion> {
    return this.http.post<CarouselPromotion>(
      `${this.apiUrl}/promotions/carousel-promotions/`,
      data
    );
  }

  updateCarouselPromotion(id: number, data: FormData): Observable<CarouselPromotion> {
    return this.http.patch<CarouselPromotion>(
      `${this.apiUrl}/promotions/carousel-promotions/${id}/`,
      data
    );
  }

  deleteCarouselPromotion(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/promotions/carousel-promotions/${id}/`
    );
  }

  // ==================== PRODUCT PROMOTIONS ====================
  
  getActiveProductPromotions(): Observable<ProductPromotion[]> {
    return this.http.get<ProductPromotion[]>(
      `${this.apiUrl}/promotions/product-promotions/active/`
    );
  }

  getAllProductPromotions(activeOnly: boolean = false): Observable<ProductPromotion[]> {
    const url = activeOnly 
      ? `${this.apiUrl}/promotions/product-promotions/?active_only=true`
      : `${this.apiUrl}/promotions/product-promotions/`;
    return this.http.get<ProductPromotion[]>(url);
  }

  getProductPromotion(id: number): Observable<ProductPromotion> {
    return this.http.get<ProductPromotion>(
      `${this.apiUrl}/promotions/product-promotions/${id}/`
    );
  }

  createProductPromotion(promotion: Partial<ProductPromotion>): Observable<ProductPromotion> {
    return this.http.post<ProductPromotion>(
      `${this.apiUrl}/promotions/product-promotions/`,
      promotion
    );
  }

  updateProductPromotion(id: number, promotion: Partial<ProductPromotion>): Observable<ProductPromotion> {
    return this.http.patch<ProductPromotion>(
      `${this.apiUrl}/promotions/product-promotions/${id}/`,
      promotion
    );
  }

  deleteProductPromotion(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/promotions/product-promotions/${id}/`
    );
  }

  addProductsToPromotion(promotionId: number, productIds: number[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/promotions/product-promotions/${promotionId}/add_products/`,
      { product_ids: productIds }
    );
  }

  removeProductsFromPromotion(promotionId: number, productIds: number[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/promotions/product-promotions/${promotionId}/remove_products/`,
      { product_ids: productIds }
    );
  }

  // ==================== ADMIN STATS ====================
  
  getPromotionStats(): Observable<PromotionStats> {
    return this.http.get<PromotionStats>(
      `${this.apiUrl}/admin/promotions/stats/`
    );
  }
}
