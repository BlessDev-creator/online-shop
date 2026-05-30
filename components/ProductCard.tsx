import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Product } from '../types';
import { getImageUrl } from '../constants/theme';

interface Props {
  item: Product;
  onPress: () => void;
  colors: any;
}

export default function ProductCard({ item, onPress, colors }: Props) {
  const imageUrl = getImageUrl(item.image_url);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imagePlaceholder}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="image-off-outline" size={40} color="#ccc" />
        )}
        <View style={[styles.badge, { backgroundColor: item.badgeColour || '#E53935' }]}>
          <Text style={styles.badgeText}>{item.badge || 'Sale'}</Text>
        </View>
      </View>

      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ color: '#FBC02D', fontWeight: 'bold' }}>★ {item.rating || 'N/A'}</Text>
          {item.reviews ? (
            <Text style={{ color: colors.subText, fontSize: 12, marginLeft: 5 }}>({item.reviews})</Text>
          ) : null}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name || 'Unnamed Product'}
        </Text>
        <Text style={[styles.price, { color: colors.text, marginTop: 5 }]}>
          {item.price || 'Price TBD'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  imagePlaceholder: { height: 140, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 5, left: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  name: { fontSize: 13, fontWeight: '500', height: 35 },
  price: { fontSize: 16, fontWeight: 'bold' },
});
