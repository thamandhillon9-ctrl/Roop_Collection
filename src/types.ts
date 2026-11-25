export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'admin';
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  product_count?: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text: string;
  is_primary: number;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  color: string;
  color_hex: string;
  variant_sku: string;
  price_override: number | null;
  stock_qty: number;
  reorder_level: number;
}

export interface ProductReview {
  id: number;
  product_id: number;
  reviewer_name: string;
  rating: number;
  title: string;
  comment: string;
  is_approved: number;
  created_at: string;
  product_name?: string;
  product_slug?: string;
}

export interface Product {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  base_price: number;
  discount_percent: number;
  final_price: number;
  cost_price: number;
  collection_tag: string;
  gender_segment: 'Women' | 'Men' | 'Kids' | 'Accessories';
  is_new_arrival: number;
  is_trending: number;
  is_best_seller: number;
  is_featured: number;
  status: 'active' | 'draft' | 'archived';
  rating_avg: number;
  review_count: number;
  images: ProductImage[];
  variants: ProductVariant[];
  total_stock: number;
  in_stock: boolean;
  reviews?: ProductReview[];
  related?: Product[];
}

export interface CartItem {
  product_id: number;
  variant_id: number;
  slug: string;
  name: string;
  brand: string;
  image_url: string;
  size: string;
  color: string;
  unit_price: number;
  quantity: number;
  max_stock: number;
}

export interface Address {
  id?: number;
  full_name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: number;
}

export interface OrderRecord {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_email: string;
  customer_name: string;
  shipping_address: Address;
  coupon_code: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  shipping_method: string;
  created_at: string;
  items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payment?: {
    gateway: string;
    gateway_order_id?: string;
    gateway_payment_id?: string;
    status: string;
    refund_amount: number;
    refund_status: string;
  };
  shipment?: {
    carrier: string;
    tracking_number: string;
    status: string;
    estimated_delivery: string;
  };
  returns?: Array<{
    id: number;
    reason: string;
    status: string;
    refund_amount: number;
    requested_at: string;
  }>;
}

export interface WebsiteSettings {
  promo_bar?: { enabled: boolean; text: string };
  hero_banner?: {
    kicker: string;
    title: string;
    subtitle: string;
    cta_label: string;
    offer_label: string;
    image_url: string;
  };
  featured_brands?: string[];
  operating_expenses_monthly?: { amount: number; currency: string; notes: string };
}

export type PageRoute =
  | 'home'
  | 'shop'
  | 'product'
  | 'checkout'
  | 'orders'
  | 'about'
  | 'contact'
  | 'account'
  | 'wishlist'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'shipping'
  | 'returns'
  | 'faq'
  | 'size-guide';
