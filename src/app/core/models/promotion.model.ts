export interface CarouselPromotion {
  id?: number;
  title: string;
  description: string;
  image: string;
  link_url?: string;
  button_text: string;
  is_active: boolean;
  display_order: number;
  start_date: string;
  end_date: string;
  is_currently_active?: boolean;
}

export interface ProductPromotion {
  id?: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  badge_text: string;
  badge_color: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  is_currently_active?: boolean;
  products_count?: number;
  products?: number[];
}

export interface ActivePromotion {
  id: number;
  name: string;
  badge_text: string;
  badge_color: string;
}

export interface PromotionStats {
  active_carousel_count: number;
  active_product_count: number;
  upcoming_promotions: ProductPromotion[];
  recently_expired: ProductPromotion[];
  products_with_promotions: number;
}
