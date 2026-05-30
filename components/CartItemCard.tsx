import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface CartItemCardData {
  id: string;
  name: string;
  image: string;
  variant: string;
  price: string;
  quantity: number;
  checked: boolean;
  outOfStock?: boolean;
}

export interface CartColors {
  background: string;
  card: string;
  text: string;
  subText: string;
  accent: string;
  border: string;
  danger: string;
}

interface Props {
  item: CartItemCardData;
  colors: CartColors;
  onToggleItem?: (id: string) => void;
  onQuantityChange?: (id: string, quantity: number) => void;
}

export default function CartItemCard({ item, colors, onToggleItem, onQuantityChange }: Props) {
  const isExpired = item.outOfStock === true;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, isExpired && styles.expiredCard]}> 
      <View style={styles.topRow}> 
        {!isExpired ? (
          <TouchableOpacity
            style={[styles.checkbox, item.checked && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => onToggleItem?.(item.id)}
            activeOpacity={0.8}
          >
            {item.checked && <Feather name="check" size={14} color="#fff" />}
          </TouchableOpacity>
        ) : (
          <View style={styles.checkboxPlaceholder} />
        )}

        <View style={styles.preview}> 
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
          {isExpired && (
            <View style={styles.expiredOverlay}>
              <Text style={styles.expiredText}>Out of stock</Text>
            </View>
          )}
        </View>

        <View style={styles.details}> 
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.variantRow}> 
            <Text style={[styles.variantLabel, { color: colors.subText }]}>{item.variant}</Text>
            {!isExpired && <Feather name="chevron-down" size={14} color={colors.subText} />}
          </View>
        </View>

        <Text style={[styles.price, { color: colors.text }]}>{item.price}</Text>
      </View>

      {!isExpired && (
        <View style={styles.quantityRow}> 
          <TouchableOpacity
            style={[styles.qtyButton, { borderColor: colors.border }]}
            onPress={() => onQuantityChange?.(item.id, Math.max(1, item.quantity - 1))}
          >
            <Text style={[styles.qtySymbol, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.qtyValue, { color: colors.text }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyButton, { borderColor: colors.border }]}
            onPress={() => onQuantityChange?.(item.id, item.quantity + 1)}
          >
            <Text style={[styles.qtySymbol, { color: colors.text }]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  expiredCard: { opacity: 0.75 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#CBCBCB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxPlaceholder: { width: 26, height: 26, marginRight: 12 },
  preview: { width: 86, height: 86, borderRadius: 18, overflow: 'hidden', marginRight: 12, backgroundColor: '#F4F4F4' },
  image: { width: '100%', height: '100%' },
  expiredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  expiredText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  details: { flex: 1, marginRight: 10 },
  name: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  variantRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  variantLabel: { fontSize: 12, fontWeight: '600' },
  price: { fontSize: 15, fontWeight: '900' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, justifyContent: 'flex-start' },
  qtyButton: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtySymbol: { fontSize: 18, fontWeight: '700' },
  qtyValue: { marginHorizontal: 18, fontSize: 16, fontWeight: '800' },
});