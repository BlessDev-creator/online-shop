import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Platform, StatusBar, StyleSheet,
  Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';
import { Order, Product, RootStackParamList } from '../../types';
import { theme, getImageUrl, parsePrice } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderCenter'>;

const { width: SW } = Dimensions.get('window');
const ACCENT = '#8EE53F';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = ['All', 'Unpaid', 'Processing', 'Completed', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

function filterOrders(orders: Order[], tab: Tab): Order[] {
  switch (tab) {
    case 'All':        return orders;
    case 'Unpaid':     return orders.filter(o => o.status === 'pending');
    case 'Processing': return orders.filter(o => o.status === 'confirmed' || o.status === 'shipped');
    case 'Completed':  return orders.filter(o => o.status === 'delivered');
    case 'Cancelled':  return orders.filter(o => o.status === 'cancelled');
  }
}

// ─── Status visual map ────────────────────────────────────────────────────────
const STATUS_META: Record<string, { icon: string; color: string; label: string }> = {
  pending:   { icon: 'clock-outline',      color: '#FF9800', label: 'Unpaid' },
  confirmed: { icon: 'package-variant',    color: '#2196F3', label: 'Processing' },
  shipped:   { icon: 'truck-outline',      color: '#9C27B0', label: 'Shipped' },
  delivered: { icon: 'check-circle',       color: ACCENT,    label: 'Completed' },
  cancelled: { icon: 'close-circle',       color: '#F44336', label: 'Cancelled' },
};

// ─── Action buttons per status ────────────────────────────────────────────────
function orderActions(status: Order['status']): string[] {
  switch (status) {
    case 'pending':   return ['Cancel Order'];
    case 'confirmed': return ['Track Order'];
    case 'shipped':   return ['Track Order', 'Confirm Receipt'];
    case 'delivered': return ['Buy Again', 'Review'];
    case 'cancelled': return ['Buy Again'];
  }
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, colors }: { order: Order; colors: any }) {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const actions = orderActions(order.status);
  const itemCount = order.order_items?.length ?? 0;
  const firstItem = order.order_items?.[0];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* ── Header: status + timestamp ── */}
      <View style={cardStyles.header}>
        <View style={cardStyles.statusRow}>
          <MaterialCommunityIcons name={meta.icon as any} size={16} color={meta.color} />
          <Text style={[cardStyles.statusTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={[cardStyles.timestamp, { color: colors.subText }]}>
          {formatDate(order.created_at)}
        </Text>
      </View>

      {/* ── Product thumbnail + info ── */}
      {firstItem && (
        <View style={cardStyles.productRow}>
          {/* Square thumbnail */}
          <View style={[cardStyles.thumbnail, { backgroundColor: colors.border }]}>
            <MaterialCommunityIcons name="image-off-outline" size={22} color={colors.subText} />
          </View>
          <View style={cardStyles.productInfo}>
            <Text style={[cardStyles.productName, { color: colors.text }]} numberOfLines={2}>
              {firstItem.product_name}
            </Text>
            <Text style={[cardStyles.productVariant, { color: colors.subText }]}>
              Default ×{firstItem.quantity}
            </Text>
            <Text style={[cardStyles.productPrice, { color: colors.text }]}>
              {firstItem.product_price}
            </Text>
          </View>
        </View>
      )}

      {/* ── Footer: item count + total + actions ── */}
      <View style={[cardStyles.footer, { borderTopColor: colors.border }]}>
        <Text style={[cardStyles.orderMeta, { color: colors.subText }]}>
          {itemCount} Item{itemCount !== 1 ? 's' : ''}{' '}
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            | Order Total: UGX {Number(order.total).toLocaleString()}
          </Text>
        </Text>

        <View style={cardStyles.actionRow}>
          {actions.map(action => (
            <TouchableOpacity
              key={action}
              style={[cardStyles.actionBtn, { borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <Text style={[cardStyles.actionBtnTxt, { color: colors.text }]}>
                {action}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusTxt: { fontSize: 14, fontWeight: '700' },
  timestamp: { fontSize: 12 },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 4 },
  productVariant: { fontSize: 12, marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: '800' },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  orderMeta: { fontSize: 13, marginBottom: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  actionBtnTxt: { fontSize: 13, fontWeight: '600' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  colors,
  onShop,
}: {
  colors: any;
  onShop: () => void;
}) {
  return (
    <View style={emptyStyles.wrap}>
      {/* Clipboard illustration */}
      <View style={emptyStyles.illustration}>
        {/* Clipboard body */}
        <View style={[emptyStyles.clipBody, { borderColor: '#C8E6C9', backgroundColor: '#fff' }]}>
          {/* Clip at top */}
          <View style={emptyStyles.clip} />
          {/* Lines */}
          <View style={[emptyStyles.line, { backgroundColor: '#C8E6C9', width: '60%', marginTop: 20 }]} />
          <View style={[emptyStyles.line, { backgroundColor: '#C8E6C9', width: '75%' }]} />
          <View style={[emptyStyles.line, { backgroundColor: '#C8E6C9', width: '45%' }]} />
          {/* X mark */}
          <View style={emptyStyles.xWrap}>
            <View style={[emptyStyles.xLine, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[emptyStyles.xLine, { transform: [{ rotate: '-45deg' }], position: 'absolute' }]} />
          </View>
        </View>
      </View>

      <Text style={[emptyStyles.title, { color: colors.subText }]}>Order List is Empty</Text>
      <Text style={[emptyStyles.sub, { color: colors.subText }]}>
        You haven't placed any orders yet.
      </Text>
      <TouchableOpacity style={emptyStyles.shopBtn} onPress={onShop}>
        <Text style={emptyStyles.shopBtnTxt}>Go Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  illustration: {
    width: 120,
    height: 140,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  clipBody: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  clip: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#A5D6A7',
    borderWidth: 2,
    borderColor: '#81C784',
  },
  line: { height: 5, borderRadius: 3 },
  xWrap: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  xLine: { position: 'absolute', width: 28, height: 4, borderRadius: 2, backgroundColor: '#EF9A9A' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  shopBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

// ─── Recommended product mini-card ────────────────────────────────────────────
function RecommendCard({ item, colors }: { item: Product; colors: any }) {
  const imageUrl = getImageUrl(item.image_url);
  return (
    <View
      style={[
        recStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Tags */}
      {item.badge && (
        <View style={[recStyles.tag, { backgroundColor: item.badgeColour ?? ACCENT }]}>
          <Text style={recStyles.tagTxt}>{item.badge}</Text>
        </View>
      )}
      {/* Image */}
      <View style={[recStyles.imgWrap, { backgroundColor: colors.border }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="image-off-outline" size={28} color={colors.subText} />
        )}
      </View>
      <View style={{ padding: 8 }}>
        <Text style={[recStyles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[recStyles.price, { color: '#111' }]}>{item.price ?? 'TBD'}</Text>
      </View>
    </View>
  );
}

const recStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    margin: 5,
  },
  tag: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  imgWrap: { height: 110, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '800' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OrderCenterScreen({ route, navigation }: Props) {
  const { isDarkMode, session } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const initTab: Tab = (route.params?.initialTab as Tab) ?? 'All';
  const [activeTab, setActiveTab] = useState<Tab>(initTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const tabScrollRef = useRef<ScrollView>(null);

  const fetchOrders = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  const fetchRecs = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').limit(6);
    setRecommendations((data as Product[]) ?? []);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchRecs();
  }, [fetchOrders, fetchRecs]);

  const visibleOrders = filterOrders(orders, activeTab);
  const isEmpty = visibleOrders.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Center</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Custom material top tabs ── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabTxt,
                    active
                      ? { color: '#000', fontWeight: '800' }
                      : { color: colors.subText, fontWeight: '500' },
                  ]}
                >
                  {tab}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View>
              <EmptyState
                colors={colors}
                onShop={() => navigation.navigate('MainTabs', { screen: 'Home' } as any)}
              />

              {/* Recommended products */}
              {recommendations.length > 0 && (
                <>
                  <Text style={[styles.recsTitle, { color: colors.text }]}>
                    You May Also Like
                  </Text>
                  <FlatList
                    data={recommendations}
                    keyExtractor={p => p.id}
                    numColumns={2}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <RecommendCard item={item} colors={colors} />
                    )}
                  />
                </>
              )}
            </View>
          }
          renderItem={({ item }) => <OrderCard order={item} colors={colors} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },

  // Tab bar
  tabBar: { borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabTxt: { fontSize: 14 },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },

  // Content
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 14, paddingBottom: 30 },

  // Recs
  recsTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 5,
  },
});
