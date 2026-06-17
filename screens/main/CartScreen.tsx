import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../context/AppContext';
import { CartContent } from '../../components/CartContent';
import type { CartItemCardData as CartItemData } from '../../components/CartItemCard';
import { theme, parsePrice } from '../../constants/theme';
import { supabase } from '../../supabase';
import { Product, RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const { cart, updateQuantity, placeOrder, isDarkMode, addToCart, clearCart } = useAppContext();
  const navigation = useNavigation<Nav>();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [selectedIds, setSelectedIds]         = useState<string[]>([]);
  const [isCheckingOut, setIsCheckingOut]     = useState(false);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [flashSaleLoading, setFlashSaleLoading]   = useState(true);

  // ── Fetch flash sale products ───────────────────────────────────────────────
  const fetchFlashSale = useCallback(async () => {
    setFlashSaleLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('flash_sale', true)
      .order('name');
    setFlashSaleProducts((data as Product[]) ?? []);
    setFlashSaleLoading(false);
  }, []);

  useEffect(() => { fetchFlashSale(); }, [fetchFlashSale]);

  // ── Auto-select all cart items ──────────────────────────────────────────────
  useEffect(() => {
    setSelectedIds(cart.map(item => item.product.id));
  }, [cart]);

  // ── Build display data ──────────────────────────────────────────────────────
  const activeItems: CartItemData[] = useMemo(
    () => cart.map(item => ({
      id:       item.product.id,
      name:     item.product.name,
      image:    item.product.image_url || '',
      variant:  'Black ×1',
      price:    item.product.price || 'UGX 0',
      quantity: item.quantity,
      checked:  selectedIds.includes(item.product.id),
    })),
    [cart, selectedIds],
  );

  const selectedTotal = useMemo(
    () => cart
      .filter(ci => selectedIds.includes(ci.product.id))
      .reduce((sum, ci) => sum + parsePrice(ci.product.price) * ci.quantity, 0),
    [cart, selectedIds],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleItem    = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  const handleSelectAll     = (select: boolean) =>
    setSelectedIds(select ? cart.map(i => i.product.id) : []);

  const handleQuantityChange = async (id: string, qty: number) => {
    const result = await updateQuantity(id, qty);
    if (!result.success && result.error) {
      Alert.alert('Quantity update failed', result.error);
    }
  };

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    const { success, error } = await placeOrder();
    setIsCheckingOut(false);
    if (success) {
      Alert.alert('Order Placed!', 'Your order has been placed successfully.');
    } else if (error) {
      Alert.alert('Checkout Failed', error);
    }
  };

  const handleCancelAll = () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Remove All Items',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Remove All', style: 'destructive', onPress: clearCart },
      ],
    );
  };

  const handleFlashSaleItemPress = (product: Product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const handleAddFlashSaleToCart = async (product: Product) => {
    const result = await addToCart(product);
    if (!result.success) {
      Alert.alert('Unable to add item', result.error);
      return;
    }

    Alert.alert('Added to Cart', `${product.name} added to your cart!`, [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CartContent
        colors={colors}
        cartItems={activeItems}
        flashSaleProducts={flashSaleProducts}
        flashSaleLoading={flashSaleLoading}
        selectedAll={selectedIds.length === activeItems.length && activeItems.length > 0}
        totalPrice={`UGX ${selectedTotal.toLocaleString()}`}
        onToggleItem={handleToggleItem}
        onSelectAll={handleSelectAll}
        onCancelAll={handleCancelAll}
        onQuantityChange={handleQuantityChange}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
        onFlashSaleItemPress={handleFlashSaleItemPress}
        onAddFlashSaleToCart={handleAddFlashSaleToCart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
