export interface Product {
  id: string;
  name: string;
  badge: string;
  badgeColour: string | null;
  rating: string | null;
  reviews: string | null;
  price: string | null;
  image_url: string | null;
  category: string | null;
  stock_quantity: number | null;
  flash_sale?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: string;
  quantity: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  wallet_balance: number | null;
  created_at: string;
}

export type RootStackParamList = {
  AuthStart: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  ProductDetails: { product: Product };
  AdminDashboard: undefined;
  OrderCenter: { initialTab?: string };
  Wallet: undefined;
};

export type TabParamList = {
  Home: undefined;
  Category: { categoryName?: string; dbCategory?: string };
  Cart: undefined;
  Profile: undefined;
};
