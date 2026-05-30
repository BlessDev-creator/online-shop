import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../supabase';
import { useAppContext } from '../../context/AppContext';
import { theme } from '../../constants/theme';
import { Order } from '../../types';
import WalletDepositModal from '../../components/modals/WalletDepositModal';

const ACCENT = '#8EE53F';

// ── Brand card colors (always dark — looks like a real payment card in both modes)
const CARD_BG  = '#0F1923';
const CARD_BG2 = '#162035';

const STATUS_COLOR: Record<string, string> = {
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

export default function WalletScreen() {
  const navigation = useNavigation();
  const { walletBalance, session, isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [orders, setOrders]               = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [depositOpen, setDepositOpen]     = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!session?.user?.id) return;
    setOrdersLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setOrders((data as Order[]) ?? []);
    setOrdersLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance card (always dark — brand payment card style) ─────── */}
        <View style={styles.card}>
          <View style={styles.cardCircle1} />
          <View style={styles.cardCircle2} />

          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardEyebrow}>MY WALLET</Text>
              <Text style={styles.cardBalanceLabel}>Total Balance</Text>
            </View>
            <View style={styles.cardIconWrap}>
              <Feather name="credit-card" size={22} color="rgba(255,255,255,0.85)" />
            </View>
          </View>

          <Text style={styles.cardBalance}>{fmtUGX(walletBalance)}</Text>

          {/* Mini stats */}
          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <Text style={styles.cardStatLabel}>Total Spent</Text>
              <Text style={styles.cardStatValue}>{fmtUGX(totalSpent)}</Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStat}>
              <Text style={styles.cardStatLabel}>Purchases</Text>
              <Text style={styles.cardStatValue}>
                {orders.filter(o => o.status !== 'cancelled').length}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.depositBtn}
            onPress={() => setDepositOpen(true)}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={15} color="#111" style={{ marginRight: 7 }} />
            <Text style={styles.depositBtnTxt}>Deposit / Top-up</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent transactions (orders) ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Purchases</Text>
            <TouchableOpacity
              onPress={fetchOrders}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="refresh-cw" size={14} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {ordersLoading ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="shopping-bag" size={40} color={colors.border} />
              <Text style={[styles.emptyTxt, { color: colors.text }]}>No purchases yet</Text>
              <Text style={[styles.emptySubTxt, { color: colors.subText }]}>
                Your order history will appear here
              </Text>
            </View>
          ) : (
            orders.map(order => (
              <View
                key={order.id}
                style={[
                  styles.txRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Status icon */}
                <View style={[
                  styles.txIcon,
                  { backgroundColor: (STATUS_COLOR[order.status] ?? '#888') + '18' },
                ]}>
                  <Feather
                    name={order.status === 'cancelled' ? 'x-circle' : 'shopping-bag'}
                    size={18}
                    color={STATUS_COLOR[order.status] ?? '#888'}
                  />
                </View>

                {/* Info */}
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={[styles.txSub, { color: colors.subText }]}>
                    {order.order_items?.length ?? 0} item(s) · {fmtDate(order.created_at)}
                  </Text>
                </View>

                {/* Amount + status */}
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      order.status === 'cancelled' && {
                        color: colors.subText,
                        textDecorationLine: 'line-through',
                      },
                    ]}
                  >
                    -{fmtUGX(Number(order.total))}
                  </Text>
                  <View style={[
                    styles.txStatusPill,
                    { backgroundColor: (STATUS_COLOR[order.status] ?? '#888') + '18' },
                  ]}>
                    <Text style={[
                      styles.txStatusTxt,
                      { color: STATUS_COLOR[order.status] ?? '#888' },
                    ]}>
                      {order.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Success toast ────────────────────────────────────────────────── */}
      {toast !== null && (
        <View style={styles.toast}>
          <Feather name="check-circle" size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.toastTxt}>{toast}</Text>
        </View>
      )}

      {/* ── Deposit modal ─────────────────────────────────────────────────── */}
      <WalletDepositModal
        visible={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={amount => {
          setDepositOpen(false);
          showToast(`UGX ${amount.toLocaleString()} deposited successfully! 🎉`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  body: { paddingBottom: 40 },

  // ── Balance card (brand dark — static in both modes) ────────────────────────
  card: {
    backgroundColor: CARD_BG2,
    padding: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  cardCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -70, right: -50,
  },
  cardCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(142,229,63,0.06)', bottom: -50, left: -20,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  cardEyebrow: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, marginBottom: 3,
  },
  cardBalanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardBalance: {
    color: '#fff', fontSize: 30, fontWeight: '900',
    letterSpacing: -0.5, marginBottom: 18,
  },
  cardStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardStat: { flex: 1 },
  cardStatLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 3 },
  cardStatValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardStatDivider: {
    width: 1, height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 16,
  },
  depositBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT, paddingVertical: 13, borderRadius: 12,
  },
  depositBtnTxt: { color: '#111', fontWeight: '800', fontSize: 14 },

  // ── Transactions ─────────────────────────────────────────────────────────────
  section: { padding: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 16, fontWeight: '700' },
  emptySubTxt: { fontSize: 13 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  txIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  txSub: { fontSize: 12 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '800', color: '#E53935' },
  txStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  txStatusTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  // ── Toast ─────────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', top: 16, left: 16, right: 16, zIndex: 999,
    backgroundColor: '#2E7D32', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  toastTxt: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
});
