import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const PAYMENT_METHODS = [
  { id: 'momo', label: 'Mobile Money',     icon: 'smartphone'  },
  { id: 'card', label: 'Credit/Debit Card', icon: 'credit-card' },
  { id: 'bank', label: 'Bank Transfer',    icon: 'briefcase'   },
] as const;

const QUICK_AMOUNTS = [10_000, 50_000, 100_000, 500_000];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

export default function WalletDepositModal({ visible, onClose, onSuccess }: Props) {
  const { depositToWallet } = useAppContext();

  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState<'momo' | 'card' | 'bank'>('momo');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) { setAmount(''); setMethod('momo'); }
  }, [visible]);

  const handleConfirm = async () => {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }
    setLoading(true);
    await new Promise(res => setTimeout(res, 2000)); // 2-second network simulation
    const { success, error } = await depositToWallet(num);
    setLoading(false);
    if (success) {
      onSuccess(num);
      setAmount('');
    } else {
      Alert.alert('Deposit Failed', error ?? 'Something went wrong.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>Top Up Wallet</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={s.fieldLabel}>AMOUNT (UGX)</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>UGX</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#CCC"
              />
            </View>

            {/* Quick chips */}
            <View style={s.quickRow}>
              {QUICK_AMOUNTS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.quickChip, amount === String(v) && s.quickChipActive]}
                  onPress={() => setAmount(String(v))}
                >
                  <Text style={[s.quickChipTxt, amount === String(v) && { color: '#111' }]}>
                    {v >= 1000 ? `${v / 1000}K` : v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment methods */}
            <Text style={[s.fieldLabel, { marginTop: 20 }]}>PAYMENT METHOD</Text>
            <View style={s.methodList}>
              {PAYMENT_METHODS.map(m => {
                const active = method === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.methodRow, active && s.methodRowActive]}
                    onPress={() => setMethod(m.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.methodIcon, active && s.methodIconActive]}>
                      <Feather name={m.icon as any} size={17} color={active ? '#8EE53F' : '#999'} />
                    </View>
                    <Text style={[s.methodLabel, active && { color: '#111', fontWeight: '700' }]}>
                      {m.label}
                    </Text>
                    <View style={[s.radio, active && s.radioActive]}>
                      {active && <View style={s.radioFill} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, { opacity: loading ? 0.65 : 1 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmTxt}>Confirm Deposit</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 18,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#111' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F2F2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#AAA', letterSpacing: 1.2, marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0',
    borderRadius: 14, paddingHorizontal: 14, height: 56, marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 16, fontWeight: '700', color: '#555', marginRight: 10,
    borderRightWidth: 1, borderRightColor: '#E0E0E0', paddingRight: 10,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111', paddingVertical: 0 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickChip: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  quickChipActive: { borderColor: '#8EE53F', backgroundColor: '#8EE53F22' },
  quickChipTxt: { fontSize: 13, fontWeight: '700', color: '#666' },
  methodList: {
    borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 14, overflow: 'hidden', marginBottom: 20,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14,
    gap: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', backgroundColor: '#fff',
  },
  methodRowActive: { backgroundColor: '#F7FFF0' },
  methodIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  methodIconActive: { backgroundColor: '#EAF9D9' },
  methodLabel: { flex: 1, fontSize: 15, color: '#555' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#8EE53F' },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8EE53F' },
  confirmBtn: {
    backgroundColor: '#8EE53F', height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmTxt: { color: '#111', fontWeight: '900', fontSize: 16 },
});
