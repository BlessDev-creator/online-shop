import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';
import { CartItem, Product, UserProfile } from '../types';
import { parsePrice } from '../constants/theme';

const CART_KEY = '@vortex_cart';
const SPLASH_MIN_MS = 2000;

interface AppContextValue {
  // Auth
  session: Session | null;
  user: UserProfile | null;
  isAppLoading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  refreshUser: () => Promise<void>;
  // Wallet
  walletBalance: number;
  depositToWallet: (amount: number) => Promise<{ success: boolean; error?: string }>;
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Cart
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => void;
  placeOrder: () => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartLoaded = useRef(false);

  const isAppLoading = !sessionReady || !minTimeElapsed;

  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);
  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  // ── Splash minimum timer ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // ── Cart: load from AsyncStorage on mount ────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then(json => {
      if (json) {
        try { setCart(JSON.parse(json)); } catch { /* ignore corrupt data */ }
      }
      cartLoaded.current = true;
    });
  }, []);

  // ── Cart: persist to AsyncStorage on every change ────────────────────
  useEffect(() => {
    if (!cartLoaded.current) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // ── Profile loader with one retry (handles slow trigger) ─────────────
  const loadUserProfile = useCallback(async (
    uid: string,
    fallback: { email?: string; full_name?: string; role?: string },
    retry = true,
  ) => {
    const { data } = await supabase.from('users').select('*').eq('id', uid).single();

    if (data) {
      setUser(data as UserProfile);
      setWalletBalance(Number(data.wallet_balance) || 0);
    } else if (retry) {
      // Trigger may still be executing — wait 1.5 s and retry once
      setTimeout(() => loadUserProfile(uid, fallback, false), 1500);
    } else {
      setUser({
        id: uid,
        email: fallback.email ?? null,
        full_name: fallback.full_name ?? null,
        role: fallback.role ?? 'user',
        avatar_url: null,
        wallet_balance: null,
        created_at: new Date().toISOString(),
      });
    }
  }, []);

  // ── Deep-link / URL handler (password reset + OAuth) ─────────────────
  const handleUrl = useCallback(async (url: string) => {
    if (!url) return;
    // Hash-based tokens (implicit flow)
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return;
    }

    // Code-based (PKCE flow)
    const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    const code = new URLSearchParams(query).get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }, []);

  useEffect(() => {
    // Check if app was opened via a deep link
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [handleUrl]);

  // ── Supabase auth state ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadUserProfile(s.user.id, {
          email: s.user.email,
          full_name: s.user.user_metadata?.full_name,
          role: s.user.user_metadata?.role,
        }).finally(() => setSessionReady(true));
      } else {
        setSessionReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        return;
      }
      setSession(s);
      if (s?.user) {
        loadUserProfile(s.user.id, {
          email: s.user.email,
          full_name: s.user.user_metadata?.full_name,
          role: s.user.user_metadata?.role,
        });
      } else {
        setUser(null);
        setCart([]);
        AsyncStorage.removeItem(CART_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  // ── Refresh user profile ─────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('users').select('*').eq('id', uid).single();
    if (data) {
      setUser(data as UserProfile);
      setWalletBalance(Number(data.wallet_balance) || 0);
    }
  }, [session?.user?.id]);

  const depositToWallet = useCallback(async (amount: number): Promise<{ success: boolean; error?: string }> => {
    const uid = session?.user?.id;
    if (!uid) return { success: false, error: 'Not authenticated.' };
    const newBalance = walletBalance + amount;
    const { error } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', uid);
    if (error) return { success: false, error: error.message };
    setWalletBalance(newBalance);
    return { success: true };
  }, [session?.user?.id, walletBalance]);

  // ── Cart operations ───────────────────────────────────────────────────
  const addToCart = useCallback(async (product: Product) => {
    if (!product.id) {
      return { success: false, error: 'This product could not be added.' };
    }

    const { data, error } = await supabase
      .from('products')
      .select('stock_quantity, name')
      .eq('id', product.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Unable to verify stock right now.' };
    }

    const available = Number(data.stock_quantity ?? 0);
    if (available <= 0) {
      return { success: false, error: `${data.name || product.name} is out of stock.` };
    }

    const currentQty = cart.find(ci => ci.product.id === product.id)?.quantity ?? 0;
    if (currentQty >= available) {
      return {
        success: false,
        error: `Only ${available} ${available === 1 ? 'unit' : 'units'} of ${data.name || product.name} are available.`,
      };
    }

    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      const nextQty = (existing?.quantity ?? 0) + 1;

      if (existing) {
        return prev.map(ci =>
          ci.product.id === product.id
            ? { ...ci, quantity: nextQty, product: { ...ci.product, stock_quantity: available } }
            : ci
        );
      }

      return [...prev, {
        product: { ...product, stock_quantity: available },
        quantity: 1,
      }];
    });

    return { success: true };
  }, [cart]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
      return { success: true };
    }

    const { data, error } = await supabase
      .from('products')
      .select('stock_quantity, name')
      .eq('id', productId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Unable to verify stock right now.' };
    }

    const available = Number(data.stock_quantity ?? 0);
    if (available <= 0) {
      setCart(prev => prev.filter(ci => ci.product.id !== productId));
      return { success: false, error: `${data.name} is currently out of stock.` };
    }

    if (quantity > available) {
      return {
        success: false,
        error: `Only ${available} ${available === 1 ? 'unit' : 'units'} of ${data.name} are available.`,
      };
    }

    setCart(prev =>
      prev.map(ci => ci.product.id === productId
        ? { ...ci, quantity, product: { ...ci.product, stock_quantity: available } }
        : ci)
    );

    return { success: true };
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    AsyncStorage.removeItem(CART_KEY);
  }, []);

  const cartCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartTotal = cart.reduce((sum, ci) => sum + parsePrice(ci.product.price) * ci.quantity, 0);

  // ── Place order ───────────────────────────────────────────────────────
  const placeOrder = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!session?.user || cart.length === 0) {
      return { success: false, error: 'Cart is empty or not logged in.' };
    }

    const productIds = cart.map(ci => ci.product.id);
    const { data: availableProducts, error: stockQueryError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .in('id', productIds);

    if (stockQueryError || !availableProducts) {
      return { success: false, error: 'Unable to verify stock right now.' };
    }

    const stockMap = new Map(
      availableProducts.map(p => [p.id, Number(p.stock_quantity ?? 0)])
    );

    for (const ci of cart) {
      const available = stockMap.get(ci.product.id) ?? 0;
      if (available < ci.quantity) {
        const itemName = ci.product.name;
        return {
          success: false,
          error: `${itemName} only has ${available} ${available === 1 ? 'unit' : 'units'} left.`,
        };
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ user_id: session.user.id, total: cartTotal, status: 'pending' })
      .select()
      .single();

    if (orderError || !order) {
      return { success: false, error: orderError?.message ?? 'Failed to create order.' };
    }

    const items = cart.map(ci => ({
      order_id: order.id,
      product_id: ci.product.id,
      product_name: ci.product.name,
      product_price: ci.product.price ?? '0',
      quantity: ci.quantity,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) {
      return { success: false, error: itemsError.message };
    }

    for (const ci of cart) {
      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({
          stock_quantity: (stockMap.get(ci.product.id) ?? 0) - ci.quantity,
        })
        .eq('id', ci.product.id)
        .gte('stock_quantity', ci.quantity);

      if (stockUpdateError) {
        await supabase.from('order_items').delete().eq('order_id', order.id);
        await supabase.from('orders').delete().eq('id', order.id);
        return {
          success: false,
          error: `Inventory changed while processing ${ci.product.name}. Please try again.`,
        };
      }
    }

    clearCart();
    return { success: true };
  }, [session, cart, cartTotal, clearCart]);

  return (
    <AppContext.Provider value={{
      session, user, isAppLoading, isPasswordRecovery, clearPasswordRecovery, refreshUser,
      walletBalance, depositToWallet,
      isDarkMode, toggleDarkMode,
      cart, cartCount, cartTotal,
      addToCart, removeFromCart, updateQuantity, clearCart, placeOrder,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
