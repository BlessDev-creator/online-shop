import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, ScrollView, Modal,
  Platform, StatusBar, StyleSheet, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';
import { RootStackParamList, Order, UserProfile } from '../../types';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';
import AdminProductsTab from './AdminProductsTab';
import AdminOrdersTab from './AdminOrdersTab';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;
type Tab = 'stats' | 'products' | 'orders';

interface Stats {
  products: number;
  orders: number;
  revenue: number;
  pending: number;
}

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending:   '#FF9800',
  confirmed: '#2196F3',
  shipped:   '#9C27B0',
  delivered: '#4CAF50',
  cancelled: '#F44336',
};

function fmtUGX(n: number) {
  return `UGX ${n.toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Pending Order Card ───────────────────────────────────────────────────────
function PendingOrderCard({
  order,
  customer,
  colors,
  onPress,
}: {
  order: Order;
  customer?: UserProfile;
  colors: any;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[order.status] ?? '#888';
  const label = order.status === 'pending' ? 'Unpaid' : 'Processing';

  return (
    <TouchableOpacity
      style={[pCard.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={pCard.topRow}>
        <View style={[pCard.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[pCard.badgeTxt, { color: statusColor }]}>{label}</Text>
        </View>
        <Text style={[pCard.time, { color: colors.subText }]}>{fmtDate(order.created_at)}</Text>
      </View>

      <View style={pCard.bodyRow}>
        <View style={{ flex: 1 }}>
          <Text style={[pCard.orderId, { color: colors.text }]}>
            #{order.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={[pCard.customer, { color: colors.subText }]} numberOfLines={1}>
            {customer?.full_name ?? customer?.email ?? 'Unknown Customer'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[pCard.amount, { color: colors.text }]}>
            {fmtUGX(Number(order.total))}
          </Text>
          <Feather name="chevron-right" size={15} color={colors.subText} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const pCard = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  time: { fontSize: 12 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderId: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  customer: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '800' },
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, colors,
}: {
  label: string; value: string | number; icon: string; color: string; colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold', marginTop: 10 }}>
        {value}
      </Text>
      <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen({ navigation }: Props) {
  const { isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [activeTab, setActiveTab]         = useState<Tab>('stats');
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading]   = useState(true);

  // ── Admin earnings (real-time) ─────────────────────────────────────────────
  const [adminEarnings, setAdminEarnings]     = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [isLive, setIsLive]                   = useState(false);
  const liveDot                               = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDot, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(liveDot, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLive, liveDot]);

  const fetchAdminEarnings = useCallback(async () => {
    setEarningsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('total')
      .neq('status', 'cancelled');
    const total = (data ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
    setAdminEarnings(total);
    setEarningsLoading(false);
  }, []);

  // ── Pending / open purchases ───────────────────────────────────────────────
  const [pendingOrders, setPendingOrders]   = useState<Order[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingUserMap, setPendingUserMap] = useState<Record<string, UserProfile>>({});

  const fetchPendingOrders = useCallback(async () => {
    setPendingLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });

    const list = (data as Order[]) ?? [];
    setPendingOrders(list);

    const uids = [...new Set(list.map(o => o.user_id))];
    if (uids.length > 0) {
      const { data: users } = await supabase.from('users').select('*').in('id', uids);
      const map: Record<string, UserProfile> = {};
      ((users as UserProfile[]) ?? []).forEach(u => { map[u.id] = u; });
      setPendingUserMap(map);
    }
    setPendingLoading(false);
  }, []);

  // ── Real-time: refresh both on any order change ────────────────────────────
  useEffect(() => {
    fetchAdminEarnings();
    fetchPendingOrders();

    const channel = supabase
      .channel('admin-orders-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.new?.status !== 'cancelled') {
          setAdminEarnings(prev => prev + (Number(payload.new.total) || 0));
          setIsLive(true);
          setTimeout(() => setIsLive(false), 4000);
        }
        fetchPendingOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchPendingOrders();
        fetchAdminEarnings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminEarnings, fetchPendingOrders]);

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const [productsRes, ordersRes, revenueRes, pendingRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total').neq('status', 'cancelled'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    const revenue = (revenueRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total), 0);
    setStats({
      products: productsRes.count ?? 0,
      orders:   ordersRes.count ?? 0,
      revenue,
      pending:  pendingRes.count ?? 0,
    });
    setStatsLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'stats') fetchStats(); }, [activeTab, fetchStats]);

  // ── Order detail modal ─────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);
    setUpdatingStatus(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    const updated = { ...order, status: newStatus as Order['status'] };
    setSelectedOrder(updated);

    if (['pending', 'confirmed'].includes(newStatus)) {
      setPendingOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    } else {
      setPendingOrders(prev => prev.filter(o => o.id !== order.id));
      setSelectedOrder(null);
    }
  };

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'stats',    label: 'Stats',    icon: 'bar-chart-2'  },
    { key: 'products', label: 'Products', icon: 'package'       },
    { key: 'orders',   label: 'Orders',   icon: 'shopping-bag'  },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Admin Panel</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tabItem,
              activeTab === t.key && { borderBottomWidth: 3, borderBottomColor: colors.accent },
            ]}
            onPress={() => setActiveTab(t.key)}
          >
            <Feather
              name={t.icon as any}
              size={18}
              color={activeTab === t.key ? colors.accent : colors.subText}
            />
            <Text style={{
              color: activeTab === t.key ? colors.accent : colors.subText,
              marginLeft: 6,
              fontWeight: activeTab === t.key ? 'bold' : 'normal',
            }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Stats tab content ───────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.statsScroll, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Total Store Balance / Earnings card ──────────────────── */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsTopRow}>
              <View>
                <Text style={styles.earningsEyebrow}>ADMIN WALLET</Text>
                <Text style={styles.earningsSubLabel}>Total Store Balance</Text>
              </View>
              <View style={styles.earningsRightCol}>
                {isLive && (
                  <Animated.View style={[styles.liveDot, { opacity: liveDot }]} />
                )}
                <View style={styles.earningsIconBox}>
                  <Feather name="trending-up" size={20} color="rgba(255,255,255,0.85)" />
                </View>
              </View>
            </View>

            {earningsLoading ? (
              <ActivityIndicator color="#8EE53F" style={{ marginVertical: 12 }} />
            ) : (
              <Text style={styles.earningsValue}>{fmtUGX(adminEarnings)}</Text>
            )}

            <View style={styles.earningsFooter}>
              <Text style={styles.earningsFooterTxt}>
                {isLive ? '🟢 New order received' : 'Synced in real-time'}
              </Text>
              <TouchableOpacity onPress={fetchAdminEarnings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="refresh-cw" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Open / Pending Purchases ──────────────────────────────── */}
          <View style={styles.pendingSection}>
            <View style={styles.pendingSectionHeader}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Open Purchases
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {pendingOrders.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.countBadgeTxt}>{pendingOrders.length}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={fetchPendingOrders} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="refresh-cw" size={14} color={colors.subText} />
                </TouchableOpacity>
              </View>
            </View>

            {pendingLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
            ) : pendingOrders.length === 0 ? (
              <View style={[styles.emptyPending, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="check-circle" size={28} color={colors.border} />
                <Text style={{ color: colors.subText, marginTop: 8, fontSize: 14 }}>
                  No open purchases
                </Text>
              </View>
            ) : (
              pendingOrders.map(order => (
                <PendingOrderCard
                  key={order.id}
                  order={order}
                  customer={pendingUserMap[order.user_id]}
                  colors={colors}
                  onPress={() => setSelectedOrder(order)}
                />
              ))
            )}
          </View>

          {/* ── Dashboard Overview tiles ──────────────────────────────── */}
          {statsLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : stats ? (
            <>
              <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 14 }]}>
                Dashboard Overview
              </Text>
              <View style={styles.statsGrid}>
                <StatCard label="Total Products" value={stats.products}                            icon="package"       color="#2196F3" colors={colors} />
                <StatCard label="Total Orders"   value={stats.orders}                              icon="shopping-bag"  color="#9C27B0" colors={colors} />
                <StatCard label="Pending Orders" value={stats.pending}                             icon="clock"         color="#FF9800" colors={colors} />
                <StatCard label="Total Revenue"  value={`UGX ${stats.revenue.toLocaleString()}`}  icon="trending-up"   color="#4CAF50" colors={colors} />
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      {activeTab === 'products' && <AdminProductsTab colors={colors} />}
      {activeTab === 'orders'   && <AdminOrdersTab   colors={colors} />}

      {/* ── Order Detail Bottom Sheet ────────────────────────────────── */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedOrder(null)} />
          {selectedOrder && (
            <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
              {/* Sheet header */}
              <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailOrderId, { color: colors.text }]}>
                    Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>
                    {fmtDateTime(selectedOrder.created_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={[styles.detailCloseBtn, { backgroundColor: colors.card }]}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                {/* Customer */}
                <Text style={[styles.detailLabel, { color: colors.subText }]}>Customer</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {pendingUserMap[selectedOrder.user_id]?.full_name
                    ?? pendingUserMap[selectedOrder.user_id]?.email
                    ?? selectedOrder.user_id.slice(0, 12)}
                </Text>

                {/* Status badge */}
                <View style={[
                  styles.detailStatusBadge,
                  { backgroundColor: (STATUS_COLORS[selectedOrder.status] ?? '#888') + '22' },
                ]}>
                  <Text style={{ color: STATUS_COLORS[selectedOrder.status] ?? '#888', fontWeight: '800', fontSize: 13, textTransform: 'capitalize' }}>
                    {selectedOrder.status}
                  </Text>
                </View>

                {/* Items */}
                <Text style={[styles.detailLabel, { color: colors.subText, marginTop: 20 }]}>Items</Text>
                {selectedOrder.order_items?.map(item => (
                  <View
                    key={item.id}
                    style={[styles.detailItemRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={{ color: colors.text, flex: 1, fontSize: 14 }} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text style={{ color: colors.subText, marginLeft: 8 }}>×{item.quantity}</Text>
                    <Text style={{ color: colors.accent, marginLeft: 12, fontWeight: '700', fontSize: 13 }}>
                      {item.product_price}
                    </Text>
                  </View>
                ))}

                {/* Total */}
                <View style={[styles.detailTotal, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Order Total</Text>
                  <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 16 }}>
                    {fmtUGX(Number(selectedOrder.total))}
                  </Text>
                </View>

                {/* Status update */}
                <Text style={[styles.detailLabel, { color: colors.subText, marginTop: 20, marginBottom: 10 }]}>
                  Update Status
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {STATUSES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor: selectedOrder.status === s
                            ? STATUS_COLORS[s]
                            : STATUS_COLORS[s] + '22',
                          opacity: updatingStatus ? 0.6 : 1,
                        },
                      ]}
                      onPress={() => handleStatusChange(selectedOrder, s)}
                      disabled={updatingStatus || selectedOrder.status === s}
                    >
                      <Text style={{
                        color: selectedOrder.status === s ? '#fff' : STATUS_COLORS[s],
                        fontWeight: '700',
                        fontSize: 12,
                        textTransform: 'capitalize',
                      }}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 14,
  },
  statsScroll: { padding: 20, paddingBottom: 40 },

  // ── Earnings card (always dark-branded) ─────────────────────────────────
  earningsCard: {
    backgroundColor: '#0F1923',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  earningsTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  earningsEyebrow: {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, marginBottom: 3,
  },
  earningsSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  earningsRightCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8EE53F' },
  earningsIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  earningsValue: {
    color: '#fff', fontSize: 28, fontWeight: '900',
    letterSpacing: -0.5, marginBottom: 14,
  },
  earningsFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  earningsFooterTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },

  // ── Open purchases ───────────────────────────────────────────────────────
  pendingSection: { marginBottom: 28 },
  pendingSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionHeading: { fontSize: 16, fontWeight: '800' },
  countBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  countBadgeTxt: { color: '#111', fontSize: 11, fontWeight: '900' },
  emptyPending: {
    borderRadius: 14, borderWidth: 1, padding: 24,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },

  // ── Stats grid ───────────────────────────────────────────────────────────
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', padding: 16, borderRadius: 14, borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // ── Order detail modal ───────────────────────────────────────────────────
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1,
  },
  detailOrderId: { fontSize: 17, fontWeight: '800' },
  detailCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  detailLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  detailValue: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  detailStatusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 4,
  },
  detailItemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1,
  },
  detailTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1,
  },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
});
