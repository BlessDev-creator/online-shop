import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import CartItemCard, { CartItemCardData, CartColors } from './CartItemCard';
import { Product } from '../types';
import { getImageUrl } from '../constants/theme';

const ACCENT = '#8EE53F';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CartViewProps {
  colors: CartColors;
  cartItems: CartItemCardData[];
  flashSaleProducts: Product[];
  flashSaleLoading: boolean;
  selectedAll: boolean;
  totalPrice: string;
  onToggleItem: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onCancelAll: () => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
  onFlashSaleItemPress: (product: Product) => void;
  onAddFlashSaleToCart: (product: Product) => void;
}

// ─── Flash sale countdown (local, decorative) ─────────────────────────────────
function useFlashCountdown() {
  const [time, setTime] = useState({ h: 3, m: 59, s: 59 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(time.h)}:${pad(time.m)}:${pad(time.s)}`;
}

// ─── Flash sale product card ──────────────────────────────────────────────────
function FlashSaleCard({
  product,
  colors,
  onPress,
  onAdd,
}: {
  product: Product;
  colors: CartColors;
  onPress: () => void;
  onAdd: () => void;
}) {
  const uri = getImageUrl(product.image_url);
  const [imgErr, setImgErr] = useState(false);

  return (
    <TouchableOpacity
      style={[fStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Thumbnail */}
      <View style={[fStyles.imgWrap, { backgroundColor: colors.background }]}>
        {uri && !imgErr ? (
          <Image
            source={{ uri }}
            style={fStyles.img}
            resizeMode="contain"
            onError={() => setImgErr(true)}
          />
        ) : (
          <Feather name="package" size={26} color={colors.border} />
        )}
      </View>

      {/* Info */}
      <View style={fStyles.info}>
        <Text style={[fStyles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={fStyles.metaRow}>
          <View style={fStyles.flashBadge}>
            <Text style={fStyles.flashBadgeTxt}>🔥 Flash</Text>
          </View>
          <Text style={[fStyles.price, { color: ACCENT }]}>{product.price}</Text>
        </View>
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={fStyles.addBtn}
        onPress={e => { e.stopPropagation?.(); onAdd(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={18} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const fStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashBadge: {
    backgroundColor: '#FF3D0022',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3D0040',
  },
  flashBadgeTxt: { color: '#D32F2F', fontSize: 11, fontWeight: '800' },
  price: { fontSize: 14, fontWeight: '800' },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main CartContent ─────────────────────────────────────────────────────────
export function CartContent({
  colors,
  cartItems,
  flashSaleProducts,
  flashSaleLoading,
  selectedAll,
  totalPrice,
  onToggleItem,
  onSelectAll,
  onCancelAll,
  onQuantityChange,
  onCheckout,
  isCheckingOut,
  onFlashSaleItemPress,
  onAddFlashSaleToCart,
}: CartViewProps) {
  const countdown = useFlashCountdown();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>Shopping Cart</Text>
          <Text style={[styles.subHeading, { color: colors.subText }]}>{cartItems.length} active item(s)</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Active items ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Items</Text>
            <TouchableOpacity onPress={onCancelAll} style={styles.deleteAction}>
              <Text style={[styles.deleteText, { color: colors.danger }]}>Cancel All</Text>
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={[styles.emptyBlock, { borderColor: colors.border }]}>
              <Feather name="shopping-bag" size={32} color={colors.border} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No active items</Text>
              <Text style={[styles.emptyDescription, { color: colors.subText }]}>
                Add products to see them here.
              </Text>
            </View>
          ) : (
            cartItems.map(item => (
              <CartItemCard
                key={item.id}
                item={item}
                colors={colors}
                onToggleItem={onToggleItem}
                onQuantityChange={onQuantityChange}
              />
            ))
          )}
        </View>

        {/* ── Flash Sale section ─────────────────────────────────────── */}
        {(flashSaleLoading || flashSaleProducts.length > 0) && (
          <View style={styles.section}>
            {/* Section header with countdown */}
            <View style={styles.flashHeader}>
              <View style={styles.flashTitleRow}>
                <Text style={[styles.flashSectionTitle, { color: colors.text }]}>
                  🔥 Flash Sale
                </Text>
                <Text style={[styles.flashSubTitle, { color: colors.subText }]}>
                  Limited Time
                </Text>
              </View>
              <View style={styles.countdownPill}>
                <Feather name="clock" size={11} color="#D32F2F" style={{ marginRight: 4 }} />
                <Text style={styles.countdownTxt}>{countdown}</Text>
              </View>
            </View>

            {flashSaleLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 20, marginBottom: 20 }} />
            ) : (
              flashSaleProducts.map(p => (
                <FlashSaleCard
                  key={p.id}
                  product={p}
                  colors={colors}
                  onPress={() => onFlashSaleItemPress(p)}
                  onAdd={() => onAddFlashSaleToCart(p)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.selectRow} onPress={() => onSelectAll(!selectedAll)}>
            <View style={[
              styles.checkbox,
              selectedAll && { backgroundColor: ACCENT, borderColor: ACCENT },
            ]}>
              {selectedAll && <Feather name="check" size={12} color="#fff" />}
            </View>
            <Text style={[styles.selectLabel, { color: colors.text }]}>
              {selectedAll ? 'Cancel All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <View style={styles.totalBlock}>
            <Text style={[styles.totalCaption, { color: colors.subText }]}>Total</Text>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{totalPrice}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutButton, { opacity: isCheckingOut ? 0.6 : 1 }]}
            onPress={onCheckout}
            disabled={isCheckingOut}
          >
            <Text style={styles.checkoutText}>
              {isCheckingOut ? 'Processing…' : 'Checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  heading: { fontSize: 24, fontWeight: '900' },
  subHeading: { marginTop: 4, fontSize: 13 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 180, paddingTop: 10 },
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  deleteAction: { padding: 6 },
  deleteText: { fontSize: 13, fontWeight: '700' },
  emptyBlock: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDescription: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Flash sale section
  flashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  flashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashSectionTitle: { fontSize: 17, fontWeight: '900' },
  flashSubTitle: { fontSize: 12, fontWeight: '500' },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3D0012',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3D0030',
  },
  countdownTxt: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 10,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectLabel: { fontSize: 13, fontWeight: '600' },
  totalBlock: { flex: 1, alignItems: 'center' },
  totalCaption: { fontSize: 11, marginBottom: 2 },
  totalLabel: { fontSize: 17, fontWeight: '800' },
  checkoutButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    minWidth: 108,
    alignItems: 'center',
  },
  checkoutText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export type { CartItemCardData, CartColors };
