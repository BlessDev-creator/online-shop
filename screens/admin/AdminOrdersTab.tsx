import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Alert, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { Order, UserProfile } from '../../types';

interface Props { colors: any; }

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
const PROGRESS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800', confirmed: '#2196F3', shipped: '#9C27B0',
  delivered: '#4CAF50', cancelled: '#F44336',
};

export default function AdminOrdersTab({ colors }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedProgress, setExpandedProgress] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    const fetchedOrders = (data as Order[]) ?? [];
    setOrders(fetchedOrders);

    // Fetch user profiles for display
    const uids = [...new Set(fetchedOrders.map(o => o.user_id))];
    if (uids.length > 0) {
      const { data: users } = await supabase.from('users').select('*').in('id', uids);
      const map: Record<string, UserProfile> = {};
      (users as UserProfile[] ?? []).forEach(u => { map[u.id] = u; });
      setUserMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);
    setUpdating(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as Order['status'] });
      }
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.tabHeader, { borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
          {orders.length} Order(s)
        </Text>
        <TouchableOpacity onPress={fetchOrders}>
          <Feather name="refresh-cw" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.subText }}>No orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item: o }) => {
            const profile = userMap[o.user_id];
            return (
              <TouchableOpacity
                style={[styles.orderRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setSelectedOrder(o)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[o.status] + '22' }]}>
                      <Text style={{ color: STATUS_COLORS[o.status], fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' }}>{o.status}</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.subText, fontSize: 12, marginTop: 3 }}>
                    {profile?.full_name ?? profile?.email ?? o.user_id.slice(0, 8)} · {formatDate(o.created_at)}
                  </Text>
                  <Text style={{ color: colors.text, marginTop: 3 }}>
                    {o.order_items?.length ?? 0} items · UGX {Number(o.total).toLocaleString()}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.subText} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Order detail modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: 'bold' }}>
                Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: colors.subText, marginBottom: 5 }}>
                  Customer: {userMap[selectedOrder.user_id]?.full_name ?? userMap[selectedOrder.user_id]?.email ?? selectedOrder.user_id.slice(0, 12)}
                </Text>
                <Text style={{ color: colors.subText, marginBottom: 15 }}>
                  Placed: {formatDate(selectedOrder.created_at)}
                </Text>

                <TouchableOpacity
                  style={[styles.progressDropdown, { borderColor: colors.border }]}
                  onPress={() => setExpandedProgress(v => !v)}
                >
                  <View>
                    <Text style={{ color: colors.subText, fontSize: 12 }}>Customer</Text>
                    <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>
                      {userMap[selectedOrder.user_id]?.full_name ?? userMap[selectedOrder.user_id]?.email ?? selectedOrder.user_id.slice(0, 12)}
                    </Text>
                  </View>
                  <Feather name={expandedProgress ? 'chevron-up' : 'chevron-down'} size={18} color={colors.subText} />
                </TouchableOpacity>

                {expandedProgress && (
                  <View style={[styles.progressPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {PROGRESS_STEPS.map((step, index) => {
                      const isDone = index < PROGRESS_STEPS.indexOf(selectedOrder.status as (typeof PROGRESS_STEPS)[number]);
                      const isCurrent = step === selectedOrder.status;
                      return (
                        <View key={step} style={styles.progressRow}>
                          <View style={[styles.progressCircle, isDone && styles.progressCircleDone, isCurrent && styles.progressCircleCurrent]}>
                            <Feather name={isDone ? 'check' : 'truck'} size={12} color={isDone || isCurrent ? '#fff' : colors.subText} />
                          </View>
                          <Text style={{ color: colors.text, fontSize: 13, textTransform: 'capitalize', marginLeft: 10 }}>
                            {step}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>Items</Text>
                {selectedOrder.order_items?.map(item => (
                  <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={{ color: colors.subText, marginLeft: 8 }}>×{item.quantity}</Text>
                    <Text style={{ color: colors.accent, marginLeft: 8, fontWeight: '600' }}>{item.product_price}</Text>
                  </View>
                ))}

                <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 20, marginBottom: 8 }}>Update Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {STATUSES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, { backgroundColor: selectedOrder.status === s ? STATUS_COLORS[s] : STATUS_COLORS[s] + '22', opacity: updating ? 0.6 : 1 }]}
                      onPress={() => handleStatusChange(selectedOrder, s)}
                      disabled={updating || selectedOrder.status === s}
                    >
                      <Text style={{ color: selectedOrder.status === s ? '#fff' : STATUS_COLORS[s], fontWeight: 'bold', fontSize: 13, textTransform: 'capitalize' }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  orderRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  progressDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  progressPanel: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  progressCircleDone: { backgroundColor: '#4CAF50' },
  progressCircleCurrent: { backgroundColor: '#8EE53F' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
});
