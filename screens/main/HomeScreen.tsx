import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, Image,
  Alert, Dimensions, Platform, StatusBar, StyleSheet, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';
import { Product, RootStackParamList } from '../../types';
import { theme, homeCategories } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';
import ProductCard from '../../components/ProductCard';

const { width: SW } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Ad banner data (swap images/content via props or CMS later) ──────────────
const BANNERS = [
  {
    id: 'b1',
    tag: '24H ONLY',
    title: 'Eid Flash Sale',
    sub: 'Up to 60% off selected tech',
    bg: '#0E1B0A',
    accent: '#8EE53F',
  },
  {
    id: 'b2',
    tag: 'NEW ARRIVALS',
    title: 'New Season Drops',
    sub: 'Discover audio & smart home kits',
    bg: '#071528',
    accent: '#38B6FF',
  },
  {
    id: 'b3',
    tag: 'TRENDING',
    title: 'Office Essentials',
    sub: 'Upgrade your workspace today',
    bg: '#1A0C00',
    accent: '#FFB84C',
  },
];

// ─── Single banner card ───────────────────────────────────────────────────────
function BannerCard({
  item,
}: {
  item: (typeof BANNERS)[number];
}) {
  const w = SW - 32; // 16px horizontal padding each side
  return (
    <View style={[bStyles.card, { width: w, backgroundColor: item.bg }]}>
      {/* decorative circles */}
      <View style={[bStyles.circle, { backgroundColor: item.accent + '25' }]} />
      <View style={[bStyles.circleInner, { backgroundColor: item.accent + '15' }]} />

      <View style={[bStyles.tag, { backgroundColor: item.accent }]}>
        <Text style={bStyles.tagTxt}>{item.tag}</Text>
      </View>
      <Text style={bStyles.title}>{item.title}</Text>
      <Text style={bStyles.sub}>{item.sub}</Text>
      <TouchableOpacity style={[bStyles.btn, { borderColor: item.accent }]}>
        <Text style={[bStyles.btnTxt, { color: item.accent }]}>Shop Now →</Text>
      </TouchableOpacity>
    </View>
  );
}

const bStyles = StyleSheet.create({
  card: {
    height: 172,
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    right: -35,
    top: -35,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  circleInner: {
    position: 'absolute',
    right: 65,
    bottom: -25,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  tagTxt: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 5 },
  sub: { color: 'rgba(255,255,255,0.62)', fontSize: 13, marginBottom: 14 },
  btn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  btnTxt: { fontSize: 13, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { isDarkMode, toggleDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;
  const navigation = useNavigation<Nav>();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<FlatList<(typeof BANNERS)[number]>>(null);
  const BANNER_W = SW - 32;

  // Fetch products from Supabase
  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .then(({ data, error }) => {
        if (error) Alert.alert('Database Error', error.message);
        else if (data) setProducts(data as Product[]);
      });
  }, []);

  // Auto-advance banner every 3.5 s
  useEffect(() => {
    const t = setInterval(() => {
      setActiveBanner(prev => {
        const next = (prev + 1) % BANNERS.length;
        try {
          bannerRef.current?.scrollToIndex({ index: next, animated: true });
        } catch {}
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setSearching(false);
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${text.trim()}%`);
    setSearchResults((data as Product[]) ?? []);
  };

  const clearSearch = () => {
    setSearch('');
    setSearching(false);
    setSearchResults([]);
  };

  const displayProducts = useMemo(
    () => (searching ? searchResults : products),
    [searching, searchResults, products],
  );

  const CARD_W = (SW - 44) / 2; // 16+16 padding + 12 gap

  // ─── List header rendered above the 2-col grid ──────────────────────────────
  const ListHeader = (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.searchBar }]}>
        <Ionicons name="search-outline" size={18} color={colors.subText} />
        <TextInput
          placeholder="Search products…"
          placeholderTextColor={colors.subText}
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      {!searching && (
        <>
          {/* ── Banner carousel ── */}
          <View style={{ marginBottom: 20 }}>
            <FlatList
              ref={bannerRef}
              data={BANNERS}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={b => b.id}
              snapToInterval={BANNER_W}
              decelerationRate="fast"
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
                setActiveBanner(idx);
              }}
              renderItem={({ item }) => <BannerCard item={item} />}
            />
            {/* Pagination dots */}
            <View style={styles.dotsRow}>
              {BANNERS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeBanner
                      ? { backgroundColor: '#8EE53F', width: 22 }
                      : { backgroundColor: colors.border, width: 8 },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* ── Quick links: 4-across circular icon grid ── */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>
            Quick Links
          </Text>
          <View style={styles.quickGrid}>
            {homeCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={styles.quickItem}
                activeOpacity={0.75}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Category',
                    params: { categoryName: cat.name, dbCategory: cat.dbCategory },
                  } as any)
                }
              >
                <View
                  style={[
                    styles.quickIconCircle,
                    {
                      backgroundColor: isDarkMode
                        ? colors.card
                        : (colors as any).brandGreenSoft,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={22}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.quickLabel, { color: colors.subText }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Section header ── */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {searching ? `Results for "${search}"` : 'Best Sellers'}
        </Text>
        {!searching && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Category' } as any)
            }
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
              See All
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Fixed app header ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Image
          source={require('../../assets/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.iconBtn}>
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Wallet')}
          >
            <MaterialCommunityIcons name="wallet-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Product 2-col grid ── */}
      <FlatList
        data={displayProducts}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons
              name={searching ? 'magnify-close' : 'shopping-outline'}
              size={56}
              color={colors.border}
            />
            <Text style={[styles.emptyTxt, { color: colors.subText }]}>
              {searching ? 'No products found.' : 'Loading products…'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: CARD_W, marginBottom: 14 }}>
            <ProductCard
              item={item}
              colors={colors}
              onPress={() => navigation.navigate('ProductDetails', { product: item })}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // App header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logo: { width: 130, height: 36 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 7, marginLeft: 4 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    marginTop: 14,
    marginBottom: 18,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Pagination dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 5,
  },
  dot: { height: 8, borderRadius: 4 },

  // Quick links 4-across grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
  },
  quickItem: { width: '25%', alignItems: 'center', marginBottom: 16 },
  quickIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  quickLabel: { fontSize: 11, textAlign: 'center', fontWeight: '500' },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },

  // List
  listContent: { paddingTop: 0, paddingBottom: 28 },
  emptyWrap: { alignItems: 'center', paddingTop: 50, gap: 12 },
  emptyTxt: { fontSize: 14 },
});
