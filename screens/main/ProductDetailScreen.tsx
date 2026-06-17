import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, TouchableOpacity,
  Image, Alert, StyleSheet, FlatList, Dimensions, Platform, StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';           // ← was missing — caused ReferenceError on mount
import { RootStackParamList } from '../../types';
import { theme, getImageUrl, parsePrice } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

const { width: SW } = Dimensions.get('window');
const ACCENT = '#8EE53F';

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(value);
        const half   = !filled && i < value;
        return (
          <MaterialCommunityIcons
            key={i}
            name={filled ? 'star' : half ? 'star-half-full' : 'star-outline'}
            size={size}
            color={ACCENT}
          />
        );
      })}
    </View>
  );
}

// ─── Countdown timer box ──────────────────────────────────────────────────────
function TimeBox({ value, label }: { value: number; label: string }) {
  const s = String(value).padStart(2, '0');
  return (
    <View style={timerStyles.box}>
      <Text style={timerStyles.num}>{s}</Text>
      <Text style={timerStyles.lbl}>{label}</Text>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 36,
  },
  num: { color: '#C00', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  lbl: { color: '#C00', fontSize: 9, fontWeight: '600', marginTop: 1 },
});

// ─── Mock product features (extend schema to replace later) ──────────────────
const MOCK_FEATURES = [
  { icon: 'lightning-bolt',      text: 'Fast Charging: 65W Super Charge' },
  { icon: 'bluetooth',           text: 'Wireless: Bluetooth 5.3 LE Audio' },
  { icon: 'water',               text: 'Water Resistant: IPX4 Rating' },
  { icon: 'package-variant',     text: 'In Box: Device, Cable, Manual' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductDetailScreen({ route, navigation }: Props) {
  const { product } = route.params;
  const { isDarkMode, addToCart, cartCount } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const imageUrl = getImageUrl(product.image_url);
  const isFlashSale = product.badge?.toLowerCase().includes('sale') ||
    product.badge?.toLowerCase().includes('flash');

  // Build a 3-slide carousel from the single image
  const slides = [imageUrl, imageUrl, imageUrl].filter(Boolean) as string[];

  const [activeSlide, setActiveSlide] = useState(0);
  const [wishlisted, setWishlisted]   = useState(false);
  const [countdown, setCountdown]     = useState({ h: 2, m: 14, s: 36 });
  const [stockQty, setStockQty]       = useState<number | null>(product.stock_quantity ?? null);

  // Always fetch the latest stock from DB (route params may be stale)
  useEffect(() => {
    supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', product.id)
      .single()
      .then(({ data }) => {
        if (data?.stock_quantity != null) setStockQty(data.stock_quantity);
      });

    // Real-time: update stock when another order decrements it
    const channel = supabase
      .channel(`pdp-stock-${product.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${product.id}` },
        (payload: any) => {
          if (payload.new?.stock_quantity != null) setStockQty(payload.new.stock_quantity);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [product.id]);
  const carouselRef = useRef<FlatList<string>>(null);

  // Flash sale countdown
  useEffect(() => {
    if (!isFlashSale) return;
    const t = setInterval(() => {
      setCountdown(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isFlashSale]);

  // Derive pricing
  const currentPrice  = parsePrice(product.price);
  const originalPrice = currentPrice > 0 ? Math.round(currentPrice * 1.25) : 0;

  const fmtUGX = (n: number) =>
    `UGX ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const ratingNum = parseFloat(product.rating ?? '4.5');

  const handleAddToCart = async () => {
    const result = await addToCart(product);
    if (!result.success) {
      Alert.alert('Unable to add item', result.error);
      return;
    }

    Alert.alert(
      'Added to Cart',
      `${product.name} has been added to your cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('MainTabs', { screen: 'Cart' } as any) },
      ],
    );
  };

  const handleBuyNow = async () => {
    const result = await addToCart(product);
    if (!result.success) {
      Alert.alert('Unable to add item', result.error);
      return;
    }

    navigation.navigate('MainTabs', { screen: 'Cart' } as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Fixed top bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' } as any)}
        >
          <Feather name="shopping-bag" size={22} color={colors.text} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Image carousel */}
        <View style={styles.carouselWrap}>
          <FlatList
            ref={carouselRef}
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
              setActiveSlide(idx);
            }}
            renderItem={({ item }) => (
              <View style={[styles.slideWrap, { backgroundColor: colors.card }]}>
                <Image
                  source={{ uri: item }}
                  style={styles.slideImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Pagination dashes */}
          <View style={styles.pagination}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dash,
                  {
                    backgroundColor: i === activeSlide ? ACCENT : colors.border,
                    width: i === activeSlide ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Details section */}
        <View style={styles.details}>
          {/* Title + Heart */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
              {product.name}
            </Text>
            <TouchableOpacity onPress={() => setWishlisted(w => !w)} style={styles.heartBtn}>
              <Feather
                name="heart"
                size={22}
                color={wishlisted ? '#E53935' : colors.subText}
                style={wishlisted ? { opacity: 1 } : {}}
              />
            </TouchableOpacity>
          </View>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <StarRating value={ratingNum} />
            <Text style={[styles.ratingNum, { color: colors.text }]}>{product.rating ?? '4.5'}</Text>
            {product.reviews ? (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    `Reviews (${product.reviews})`,
                    `This product has received ${product.reviews} review${product.reviews === '1' ? '' : 's'}.\n\nDetailed reviews will be available in a future update.`,
                    [{ text: 'OK' }],
                  )
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.reviewCount, { color: colors.subText, textDecorationLine: 'underline' }]}>
                  ({String(product.reviews)} reviews)
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Stock quantity badge */}
          {stockQty !== null && (
            <View style={[
              styles.stockBadge,
              stockQty === 0  && styles.stockOut,
              stockQty > 0 && stockQty <= 5 && styles.stockLow,
            ]}>
              <MaterialCommunityIcons
                name={stockQty === 0 ? 'package-variant-closed' : 'package-variant'}
                size={13}
                color={stockQty === 0 ? '#B71C1C' : stockQty <= 5 ? '#E65100' : '#2E7D32'}
              />
              <Text style={[
                styles.stockTxt,
                stockQty === 0  && { color: '#B71C1C' },
                stockQty > 0 && stockQty <= 5 && { color: '#E65100' },
              ]}>
                {stockQty === 0
                  ? 'Out of Stock'
                  : stockQty <= 5
                    ? `Only ${stockQty} left!`
                    : `Quantity Left: ${stockQty}`}
              </Text>
            </View>
          )}

          {/* Flash Sale banner */}
          {isFlashSale && (
            <View style={styles.flashBanner}>
              <View style={styles.flashLeft}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fff" />
                <Text style={styles.flashTitle}>Flash Sale</Text>
              </View>
              <View style={styles.timerRow}>
                <TimeBox value={countdown.h} label="HRS" />
                <Text style={styles.timerColon}>:</Text>
                <TimeBox value={countdown.m} label="MIN" />
                <Text style={styles.timerColon}>:</Text>
                <TimeBox value={countdown.s} label="SEC" />
              </View>
            </View>
          )}

          {/* Price row */}
          <View style={styles.priceBlock}>
            <Text style={[styles.currentPrice, { color: colors.text }]}>
              {currentPrice > 0 ? fmtUGX(currentPrice) : product.price ?? 'Price TBD'}
            </Text>
            {originalPrice > 0 && (
              <Text style={styles.originalPrice}>{fmtUGX(originalPrice)}</Text>
            )}
          </View>

          {/* Category badge */}
          {product.category ? (
            <View style={[styles.catPill, { backgroundColor: (colors as any).brandGreenSoft ?? '#EAF9D9', borderColor: ACCENT + '30' }]}>
              <MaterialCommunityIcons name="tag-outline" size={13} color={ACCENT} />
              <Text style={[styles.catPillTxt, { color: ACCENT }]}>
                {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </Text>
            </View>
          ) : null}

          {/* Features & Variants card */}
          <View
            style={[
              styles.featureCard,
              { backgroundColor: isDarkMode ? colors.card : '#F8F8F8', borderColor: colors.border },
            ]}
          >
            {MOCK_FEATURES.map((f, i) => (
              <View
                key={i}
                style={[
                  styles.featureRow,
                  i < MOCK_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.featureIconWrap}>
                  <MaterialCommunityIcons name={f.icon as any} size={16} color={colors.text} />
                </View>
                <Text style={[styles.featureTxt, { color: colors.text }]}>{f.text}</Text>
              </View>
            ))}

            {/* Variant selector */}
            <TouchableOpacity
              style={[
                styles.variantRow,
                { borderTopColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.variantLeft, { color: colors.subText }]}>Selected</Text>
              <View style={styles.variantRight}>
                <Text style={[styles.variantName, { color: colors.text }]}>
                  {product.badge ?? 'Speed Black'}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.subText} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky action bar ── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 18 : 10,
          },
        ]}
      >
        {/* Cart icon with badge */}
        <TouchableOpacity
          style={styles.actionCartBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' } as any)}
        >
          <Feather name="shopping-bag" size={22} color={colors.text} />
          {cartCount > 0 && (
            <View style={styles.actionCartBadge}>
              <Text style={styles.actionCartBadgeTxt}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Add to Cart */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#fff', borderColor: '#000', borderWidth: 1.5 }]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <View style={styles.actionBtnInner}>
            <Feather name="shopping-bag" size={17} color="#000" />
            <Text style={[styles.actionBtnTxt, { color: '#000' }]}>Add to Cart</Text>
          </View>
        </TouchableOpacity>

        {/* Buy Now */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#111' }]}
          onPress={handleBuyNow}
          activeOpacity={0.85}
        >
          <View style={styles.actionBtnInner}>
            <Feather name="credit-card" size={17} color="#fff" />
            <Text style={[styles.actionBtnTxt, { color: '#fff' }]}>Buy Now</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: { padding: 8, position: 'relative' },
  topBarTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: ACCENT,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeTxt: { color: '#000', fontSize: 10, fontWeight: '800' },

  // Carousel
  carouselWrap: { position: 'relative' },
  slideWrap: { width: SW, height: 300, justifyContent: 'center', alignItems: 'center' },
  slideImage: { width: '100%', height: '100%' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 5,
  },
  dash: { height: 4, borderRadius: 2 },

  // Details
  details: { padding: 16 },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', lineHeight: 30 },
  heartBtn: { padding: 4, marginTop: 2 },

  // Rating row
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  ratingNum: { fontSize: 14, fontWeight: '700' },
  reviewCount: { fontSize: 13 },

  // Flash banner
  flashBanner: {
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  flashLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flashTitle: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerColon: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 },

  // Price block
  priceBlock: { marginBottom: 14 },
  currentPrice: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  originalPrice: {
    fontSize: 15,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '500',
    marginTop: 4,
  },

  // Stock badge
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginBottom: 12,
  },
  stockLow: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  stockOut: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  stockTxt: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },

  // Category pill
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  catPillTxt: { fontSize: 12, fontWeight: '700' },

  // Feature card
  featureCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTxt: { flex: 1, fontSize: 13, lineHeight: 18 },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  variantLeft: { fontSize: 13, fontWeight: '500' },
  variantRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  variantName: { fontSize: 13, fontWeight: '700' },

  // Sticky action bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  actionCartBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  actionCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: ACCENT,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  actionCartBadgeTxt: { color: '#000', fontSize: 10, fontWeight: '800' },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTxt: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
});
