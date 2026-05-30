import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity, ScrollView,
  Image, Alert, Platform, StatusBar, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { supabase } from '../../supabase';
import { Product, RootStackParamList, TabParamList } from '../../types';
import { theme, getImageUrl } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

type Props = BottomTabScreenProps<TabParamList, 'Category'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// DB slug → icon name
const CAT_ICONS: Record<string, string> = {
  all:          'view-grid-outline',
  smart:        'watch-variant',
  audio:        'headphones',
  power:        'battery-charging-50',
  'flash sale': 'tag-outline',
  new:          'new-box',
  'nc excl':    'trophy-outline',
  'check-in':   'calendar-check',
  'app offer':  'cellphone-check',
  office:       'monitor-dashboard',
  personal:     'hand-heart-outline',
};

function catIcon(id: string): string {
  return CAT_ICONS[id.toLowerCase()] ?? 'grid';
}

// ─── Product list-view card (right panel) ─────────────────────────────────────
function ProductListCard({
  item,
  colors,
  onPress,
}: {
  item: Product;
  colors: any;
  onPress: () => void;
}) {
  const imageUrl = getImageUrl(item.image_url);
  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: colors.border }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="image-off-outline" size={26} color={colors.subText} />
        )}
        {item.badge ? (
          <View style={[styles.badge, { backgroundColor: item.badgeColour ?? '#8EE53F' }]}>
            <Text style={styles.badgeTxt}>{item.badge}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
          {item.name ?? 'Unnamed Product'}
        </Text>

        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={13} color="#FBC02D" />
          <Text style={styles.ratingVal}>{item.rating ?? '4.5'}</Text>
          {item.reviews ? (
            <Text style={[styles.ratingCnt, { color: colors.subText }]}>({item.reviews})</Text>
          ) : null}
        </View>

        <Text style={[styles.price, { color: colors.accent }]}>
          {item.price ?? 'Price TBD'}
        </Text>
      </View>

      <Feather
        name="chevron-right"
        size={16}
        color={colors.subText}
        style={{ alignSelf: 'center', marginRight: 8 }}
      />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen({ route }: Props) {
  const { isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;
  const navigation = useNavigation<Nav>();

  const initDb = route.params?.dbCategory ?? null;
  const [activeFilter, setActiveFilter] = useState<string | null>(initDb);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with route param (e.g. navigated from Home quick links)
  useEffect(() => {
    setActiveFilter(route.params?.dbCategory ?? null);
  }, [route.params?.dbCategory]);

  // Load distinct categories from DB once
  useEffect(() => {
    supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
      .then(({ data }) => {
        const unique = [
          ...new Set(
            (data ?? []).map((r: any) => (r.category as string).toLowerCase()),
          ),
        ]
          .filter(Boolean)
          .sort();
        setCategories(unique);
      });
  }, []);

  // Fetch products whenever the filter changes
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from('products').select('*');
    if (activeFilter) {
      query = query.ilike('category', `%${activeFilter}%`);
    }
    const { data, error } = await query;
    if (error) Alert.alert('Query Error', error.message);
    else setProducts((data as Product[]) ?? []);
    setIsLoading(false);
  }, [activeFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Build sidebar list: "All" + DB-driven categories
  const sideItems = [
    { id: '__all', label: 'All', key: null },
    ...categories.map(c => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      key: c,
    })),
  ];

  const isActive = (key: string | null) =>
    key === null ? activeFilter === null : activeFilter === key;

  const displayTitle = activeFilter
    ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
    : 'All Categories';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Page header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {route.params?.categoryName ?? displayTitle}
        </Text>
        <Text style={[styles.headerCount, { color: colors.subText }]}>
          {isLoading ? '…' : `${products.length} item${products.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* ── Split body ── */}
      <View style={styles.body}>
        {/* Left sidebar (25%) */}
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: isDarkMode ? '#161616' : '#F5F5F5',
              borderRightColor: colors.border,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {sideItems.map(item => {
              const active = isActive(item.key);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sideItem,
                    {
                      borderLeftColor: active ? '#8EE53F' : 'transparent',
                      backgroundColor: active
                        ? isDarkMode ? '#1A3B08' : '#EAF9D9'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setActiveFilter(item.key)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.sideIconWrap,
                      {
                        backgroundColor: active
                          ? '#8EE53F22'
                          : isDarkMode ? colors.card : '#E8E8E8',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={catIcon(item.id === '__all' ? 'all' : item.id) as any}
                      size={17}
                      color={active ? '#8EE53F' : colors.subText}
                    />
                  </View>
                  <Text
                    style={[
                      styles.sideLabel,
                      {
                        color: active ? '#8EE53F' : colors.subText,
                        fontWeight: active ? '700' : '400',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right content (75%) */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8EE53F" />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons
                name="emoticon-sad-outline"
                size={56}
                color={colors.border}
                style={{ marginBottom: 10 }}
              />
              <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
                Nothing here yet
              </Text>
              <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 6, fontSize: 13 }}>
                {activeFilter ? `No products in "${activeFilter}".` : 'No products found.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 10, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ProductListCard
                  item={item}
                  colors={colors}
                  onPress={() => navigation.navigate('ProductDetails', { product: item })}
                />
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  headerCount: { fontSize: 13 },

  // Body
  body: { flex: 1, flexDirection: 'row' },

  // Sidebar
  sidebar: { width: '25%', borderRightWidth: 1 },
  sideItem: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderLeftWidth: 3,
  },
  sideIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  sideLabel: { fontSize: 10.5, textAlign: 'center', lineHeight: 14 },

  // Right content
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Product list card
  listCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  thumb: {
    width: 86,
    height: 86,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  cardName: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  ratingVal: { color: '#FBC02D', fontSize: 12, fontWeight: '700' },
  ratingCnt: { fontSize: 11 },
  price: { fontSize: 14, fontWeight: '800' },
});
