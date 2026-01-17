import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES ====================

export interface User {
  id: number;
  email: string;
  phone: string;
  role: 'ADMIN' | 'CUSTOMER';
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_joined: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  parent: number | null;
  children?: Category[];
}

export interface ProductImage {
  id: number;
  image: string; // URL
}

export interface ActivePromotion {
  id: number;
  name: string;
  badge_text: string;
  badge_color: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  category: number;
  category_name: string;
  images: ProductImage[];
  created_at: string;
  has_promotion: boolean;
  active_promotion?: ActivePromotion;
  promotional_price?: number;
  discount_percentage?: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  status: 'PLACED' | 'PACKED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
  payment_status: 'PAID' | 'PENDING' | 'FAILED';
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

export interface Delivery {
  id: number;
  order: number;
  status: 'PLACED' | 'PACKED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
  estimated_delivery: string | null; // YYYY-MM-DD
  updated_at: string;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  date_joined: string;
}

export interface Address {
  id: number;
  label: string;
  city: string;
  address_line: string;
  is_default: boolean;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface AdminSummary {
  total_orders: number;
  total_revenue: number | string; // Backend return string
  total_customers: number;
  total_products: number;
  active_products?: number;
  low_stock_count: number;
  recent_orders: number | Order[]; // Backend returns count, not array
  pending_orders: number | Order[]; // Backend returns count, not array
}

export interface DailySalesData {
  date: string;
  sales: number;
  orders: number;
}

export interface SalesByStatus {
  status: string;
  count: number;
  revenue: number;
}

export interface TopProduct {
  id: number;
  name: string;
  total_sold: number;
  total_revenue: number;
  product: Product;
}

export interface AdminSalesResponse {
  daily_sales: DailySalesData[];
  sales_by_status: SalesByStatus[];
  top_products: TopProduct[];
}

export interface StockAlertProduct {
  id: number;
  name: string;
  category_name: string;
  current_stock: number;
  price: number;
  images: ProductImage[];
  minimum_threshold: number;
}

export interface StockAlertsResponse {
  low_stock: StockAlertProduct[];
  out_of_stock: StockAlertProduct[];
}


@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // ==================== AUTH ====================
  
  /**
   * Register a new user
   */
  register(email: string, password: string, phone?: string): Observable<AuthResponse> {
    const body = { email, password, phone };
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register/`, body);
  }

  /**
   * Login user
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const body = { email, password };
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login/`, body);
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me/`);
  }

  // ==================== CATEGORIES ====================
  
  /**
   * Get all categories
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories/`);
  }

  /**
   * Create category (Admin only)
   */
  createCategory(name: string, parent?: number): Observable<Category> {
    const body = { name, parent: parent || null };
    return this.http.post<Category>(`${this.baseUrl}/categories/`, body);
  }

  // ==================== PRODUCTS ====================
  
  /**
   * Get all products with optional filtering
   */
  getProducts(params?: {
    category?: number;
    search?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
  }): Observable<Product[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<Product[]>(`${this.baseUrl}/products/`, { params: httpParams });
  }

  /**
   * Get single product by ID
   */
  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${id}/`);
  }

  /**
   * Create product (Admin only)
   * Images can be uploaded with the product using uploaded_images field
   */
  createProduct(productData: {
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    category: number;
  }, images?: File[]): Observable<Product> {
    const formData = new FormData();
    
    // Append product data
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('price', productData.price.toString());
    formData.append('stock_quantity', productData.stock_quantity.toString());
    formData.append('is_active', productData.is_active.toString());
    formData.append('category', productData.category.toString());
    
    // Append images if provided
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('uploaded_images', image);
      });
    }
    
    return this.http.post<Product>(`${this.baseUrl}/products/`, formData);
  }

  /**
   * Update product (Admin only)
   * Images can be uploaded with the update using uploaded_images field
   */
  updateProduct(id: number, productData: Partial<{
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    category: number;
  }>, images?: File[]): Observable<Product> {
    const formData = new FormData();
    
    // Append product data
    if (productData.name !== undefined) formData.append('name', productData.name);
    if (productData.description !== undefined) formData.append('description', productData.description);
    if (productData.price !== undefined) formData.append('price', productData.price.toString());
    if (productData.stock_quantity !== undefined) formData.append('stock_quantity', productData.stock_quantity.toString());
    if (productData.is_active !== undefined) formData.append('is_active', productData.is_active.toString());
    if (productData.category !== undefined) formData.append('category', productData.category.toString());
    
    // Append images if provided
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('uploaded_images', image);
      });
    }
    
    return this.http.put<Product>(`${this.baseUrl}/products/${id}/`, formData);
  }

  /**
   * Delete product (Admin only)
   */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${id}/`);
  }

  // ==================== CART ====================
  
  /**
   * Get current user's cart
   */
  getCart(): Observable<Cart> {
    return this.http.get<Cart>(`${this.baseUrl}/cart/`);
  }

  /**
   * Add product to cart
   */
  addToCart(productId: number, quantity: number = 1): Observable<Cart> {
    const body = { product_id: productId, quantity };
    return this.http.post<Cart>(`${this.baseUrl}/cart/add/`, body);
  }

  /**
   * Update cart item quantity
   */
  updateCartItem(itemId: number, quantity: number): Observable<Cart> {
    const body = { quantity };
    return this.http.put<Cart>(`${this.baseUrl}/cart/update/${itemId}/`, body);
  }

  /**
   * Remove item from cart
   */
  removeCartItem(itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.baseUrl}/cart/remove/${itemId}/`);
  }

  // ==================== ORDERS ====================
  
  /**
   * Checkout current cart
   */
  checkout(orderData: any): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders/checkout/`, orderData);
  }

  /**
   * Get all user orders
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/`);
  }

  /**
   * Get single order by ID
   */
  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}/`);
  }

  /**
   * Cancel order (if status is PLACED)
   */
  cancelOrder(orderId: number): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/cancel/`, {});
  }

  // ==================== DELIVERY ====================
  
  /**
   * Get delivery tracking for an order
   */
  getDelivery(orderId: number): Observable<Delivery> {
    return this.http.get<Delivery>(`${this.baseUrl}/delivery/${orderId}/`);
  }

  /**
   * Update delivery status (Admin only)
   * PUT /api/delivery/{order_id}/update_status/
   */
  updateDeliveryStatus(orderId: number, status: Delivery['status'], notes?: string): Observable<Delivery> {
    const body = { status, notes };
    return this.http.put<Delivery>(`${this.baseUrl}/delivery/${orderId}/update_status/`, body);
  }

  // ==================== ADMIN ====================
  
  /**
   * Get admin dashboard summary
   * Returns: total orders, revenue, customers, products, low stock count, recent orders, pending orders
   */
  getAdminSummary(): Observable<AdminSummary> {
    return this.http.get<AdminSummary>(`${this.baseUrl}/admin/summary/`);
  }

  /**
   * Get all orders (Admin only)
   * Returns: all orders from all users
   */
  getAdminOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/admin/orders/`);
  }

  /**
   * Get sales analytics
   * Returns: daily sales data, sales by status, top 10 products
   * Optional query param: days
   */
 getAdminSales(days: number = 30): Observable<AdminSalesResponse> {
  const params = new HttpParams().set('days', days.toString());
  return this.http.get<AdminSalesResponse>(`${this.baseUrl}/admin/sales/`, { params });
}

  /**
   * Get low stock alerts
   * Returns: low stock products, out of stock products with details
   * Optional query param: threshold (default: 10)
   */
getStockAlerts(threshold: number = 10): Observable<StockAlertsResponse> {
  const params = new HttpParams().set('threshold', threshold.toString());
  return this.http.get<StockAlertsResponse>(`${this.baseUrl}/admin/stock-alerts/`, { params });
}

// ==================== USER MANAGEMENT ====================

/**
 * Get all users (admin endpoint)
 */
getCustomers(): Observable<User[]> {
  return this.http.get<User[]>(`${this.baseUrl}/auth/users/`);
}

/**
 * Get specific user details
 */
getUser(userId: number): Observable<User> {
  return this.http.get<User>(`${this.baseUrl}/auth/users/${userId}/`);
}

updateUserRole(userId: number, role: 'ADMIN' | 'CUSTOMER'): Observable<User> {
  return this.http.put<User>(`${this.baseUrl}/admin/users/${userId}/role/`, { role });
}

// ==================== PROFILE & ADDRESSES ====================

getProfile(): Observable<UserProfile> {
  return this.http.get<UserProfile>(`${this.baseUrl}/auth/profile/`);
}

updateProfile(data: { first_name: string; last_name: string; phone_number: string; email: string }): Observable<UserProfile> {
  return this.http.put<UserProfile>(`${this.baseUrl}/auth/profile/`, data);
}

getAddresses(): Observable<Address[]> {
  return this.http.get<Address[]>(`${this.baseUrl}/auth/addresses/`);
}

getAddress(id: number): Observable<Address> {
  return this.http.get<Address>(`${this.baseUrl}/auth/addresses/${id}/`);
}

createAddress(data: Partial<Address>): Observable<Address> {
  return this.http.post<Address>(`${this.baseUrl}/auth/addresses/`, data);
}

updateAddress(id: number, data: Partial<Address>): Observable<Address> {
  return this.http.put<Address>(`${this.baseUrl}/auth/addresses/${id}/`, data);
}

deleteAddress(id: number): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/auth/addresses/${id}/`);
}

}