import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  Alert, ActivityIndicator, ScrollView, StyleSheet, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase';
import { useAppContext } from '../../context/AppContext';
import { getImageUrl } from '../../constants/theme';
import { Product } from '../../types';

interface Props { colors: any; }

type FormState = {
  name: string;
  price: string;
  category: string;
  image_url: string;
  badge: string;
  badgeColour: string;
  rating: string;
  reviews: string;
  stock_quantity: string;
};

const EMPTY_FORM: FormState = {
  name: '', price: '', category: '', image_url: '',
  badge: 'New', badgeColour: '#008ADE', rating: '4.5', reviews: '0',
  stock_quantity: '100',
};

const CATEGORIES = ['smart', 'audio', 'power', 'gaming', 'accessories', 'wearables', 'cameras'];

const BADGE_PRESETS = [
  { label: 'New',        color: '#008ADE' },
  { label: 'Hot',        color: '#E53935' },
  { label: 'Sale',       color: '#FF9800' },
  { label: 'Flash Sale', color: '#E53935' },
  { label: 'Popular',    color: '#8EE53F' },
  { label: 'Featured',   color: '#9C27B0' },
];

const STORAGE_BUCKET       = 'gadgets';
const ALLOWED_PRODUCT_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES     = 5 * 1024 * 1024; // 5 MB

export default function AdminProductsTab({ colors }: Props) {
  const { user } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts]         = useState<Product[]>([]);
  const [filtered, setFiltered]         = useState<Product[]>([]);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Product | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [imgPreviewErr, setImgPreviewErr] = useState(false);

  // Picked local assets from the device gallery
  const [pickedAssets, setPickedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    const list = (data as Product[]) ?? [];
    setProducts(list);
    setFiltered(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Real-time: reflect stock changes without a manual refresh
  useEffect(() => {
    const channel = supabase
      .channel('admin-products-stock')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload: any) => {
          const updated = payload.new as Product;
          const merge = (list: Product[]) =>
            list.map(p => p.id === updated.id ? { ...p, ...updated } : p);
          setProducts(prev => merge(prev));
          setFiltered(prev => merge(prev));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      q
        ? products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.category ?? '').toLowerCase().includes(q) ||
            (p.badge ?? '').toLowerCase().includes(q),
          )
        : products,
    );
  }, [search, products]);

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImgPreviewErr(false);
    setUploadError(null);
    setPickedAssets([]);
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name:           p.name,
      price:          p.price          ?? '',
      category:       p.category       ?? '',
      image_url:      p.image_url      ?? '',
      badge:          p.badge          ?? 'New',
      badgeColour:    p.badgeColour    ?? '#008ADE',
      rating:         p.rating         ?? '',
      reviews:        p.reviews        ?? '',
      stock_quantity: String(p.stock_quantity ?? 100),
    });
    setImgPreviewErr(false);
    setUploadError(null);
    setPickedAssets([]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setUploadError(null);
    setPickedAssets([]);
  };

  const setField = (k: keyof FormState) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  // ── Device gallery picker (admin-only) ───────────────────────────────────────
  const handlePickImages = async () => {
    // Role guard — double-checked even though the UI is already hidden for non-admins
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admin users can upload product images.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library in your device settings.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      const valid   = result.assets.filter(a =>
        (!a.mimeType || ALLOWED_PRODUCT_MIME.includes(a.mimeType)) &&
        (!a.fileSize  || a.fileSize <= MAX_UPLOAD_BYTES),
      );
      const skipped = result.assets.length - valid.length;
      if (skipped > 0) {
        setUploadError(`${skipped} file(s) skipped — must be JPEG, PNG, or WebP and under 5 MB.`);
      } else {
        setUploadError(null);
      }
      if (valid.length === 0) return;
      setPickedAssets(valid);
      setField('image_url')(valid[0].uri);
      setImgPreviewErr(false);
    }
  };

  // ── Upload first picked asset to Supabase Storage ────────────────────────────
  const uploadFirstAsset = async (): Promise<string | null> => {
    if (pickedAssets.length === 0) return null;

    const asset    = pickedAssets[0];
    const rawName  = asset.fileName ?? `product.${(asset.uri.split('.').pop() ?? 'jpg').toLowerCase()}`;
    const safeName = rawName.replace(/\s+/g, '-');
    const path     = `admin/${Date.now()}-${safeName}`;

    const response = await fetch(asset.uri);
    const blob     = await response.blob();

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });

    if (error) throw error;

    return path;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim())  { Alert.alert('Required', 'Product name is required.');  return; }
    if (!form.price.trim()) { Alert.alert('Required', 'Price is required.');          return; }

    setSaving(true);

    // ── Upload picked image(s) before saving ──────────────────────────────────
    let finalImageUrl: string | null = form.image_url.trim() || null;

    if (isAdmin && pickedAssets.length > 0) {
      setUploading(true);
      try {
        const uploaded = await uploadFirstAsset();
        if (uploaded) finalImageUrl = uploaded;
      } catch (err: any) {
        const msg = err.message ?? 'Could not upload image to server. Please try again.';
        setUploadError(msg);
        Alert.alert('Image Upload Failed', msg);
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      name:           form.name.trim(),
      price:          form.price.trim(),
      category:       form.category.trim()    || null,
      image_url:      finalImageUrl,
      badge:          form.badge.trim()       || 'New',
      badgeColour:    form.badgeColour.trim() || null,
      rating:         form.rating.trim()      || null,
      reviews:        form.reviews.trim()     || null,  // stored as string — supports "128" or "1.5k+"
      stock_quantity: parseInt(form.stock_quantity, 10) || 0,
    };

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert([payload]);

    setSaving(false);

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      closeModal();
      fetchProducts();
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = (p: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to permanently delete "${p.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('products').delete().eq('id', p.id);
            if (error) Alert.alert('Error', error.message);
            else fetchProducts();
          },
        },
      ],
    );
  };

  // ── Image preview URI (URL field or first picked local URI) ──────────────────
  const previewUri = pickedAssets.length > 0
    ? pickedAssets[0].uri
    : getImageUrl(form.image_url);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {/* ── Sub-header (search + add) ──────────────────────────────────── */}
      <View style={[styles.subHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.subText} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 }}
            placeholder="Search by name, category, badge…"
            placeholderTextColor={colors.subText}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addFab, { backgroundColor: colors.accent }]}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Count bar */}
      <View style={[styles.countBar, { borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.subText, fontSize: 13 }}>
          {filtered.length === products.length
            ? `${products.length} product${products.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${products.length} products`}
        </Text>
        <TouchableOpacity onPress={fetchProducts} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="refresh-cw" size={14} color={colors.subText} />
        </TouchableOpacity>
      </View>

      {/* ── Product list ──────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 50 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
            <Feather name="package" size={36} color={colors.border} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 16 }}>
            {search ? 'No results found' : 'No products yet'}
          </Text>
          <Text style={{ color: colors.subText, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            {search ? 'Try a different search term' : 'Tap the + button to add your first product'}
          </Text>
          {!search && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
              onPress={openAdd}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Add First Product</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p }) => (
            <ProductRow
              p={p}
              colors={colors}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      {/* ── Add / Edit modal ──────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>

            {/* Sticky modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <Feather name="x" size={22} color="#000" />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editing ? 'Edit Product' : 'New Product'}
              </Text>
              <TouchableOpacity
                style={[styles.saveHeaderBtn, { backgroundColor: colors.accent, opacity: (saving || uploading) ? 0.55 : 1 }]}
                onPress={handleSave}
                disabled={saving || uploading}
              >
                {(saving || uploading)
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                      {editing ? 'Save' : 'Publish'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── URL / local image preview ───────────────────────── */}
              {previewUri && !imgPreviewErr ? (
                <View style={styles.imgPreviewWrap}>
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.imgPreview}
                    resizeMode="contain"
                    onError={() => setImgPreviewErr(true)}
                  />
                </View>
              ) : (
                <View style={[styles.imgPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="image" size={30} color={colors.border} />
                  <Text style={{ color: colors.subText, fontSize: 12, marginTop: 8 }}>
                    {form.image_url || pickedAssets.length > 0 ? 'Preview unavailable' : 'No image yet'}
                  </Text>
                </View>
              )}

              {/* ── SECTION: Basic Info ────────────────────────────── */}
              <FormSection label="Basic Information" />
              <FormField
                label="Product Name *"
                value={form.name}
                onChange={setField('name')}
                placeholder="e.g. Samsung Galaxy S24"
                colors={colors}
              />
              <FormField
                label="Price *"
                value={form.price}
                onChange={setField('price')}
                placeholder="e.g. UGX 4,500,000"
                colors={colors}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Rating"
                    value={form.rating}
                    onChange={setField('rating')}
                    placeholder="e.g. 4.5"
                    colors={colors}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Reviews is a STRING — accepts "128", "1.5k+", "No reviews" */}
                  <FormField
                    label="Reviews"
                    value={form.reviews}
                    onChange={setField('reviews')}
                    placeholder="e.g. 128 or 1.5k+"
                    colors={colors}
                    keyboardType="default"
                  />
                </View>
              </View>

              <FormField
                label="Stock Quantity"
                value={form.stock_quantity}
                onChange={setField('stock_quantity')}
                placeholder="e.g. 100"
                colors={colors}
                keyboardType="number-pad"
              />

              {/* ── SECTION: Media ─────────────────────────────────── */}
              <FormSection label="Media" />

              {/* ── Admin-only: device gallery picker ─────────────── */}
              {isAdmin && (
                <>
                  <TouchableOpacity
                    style={[styles.attachBtn, { borderColor: colors.accent }]}
                    onPress={handlePickImages}
                    activeOpacity={0.75}
                  >
                    <Feather name="image" size={18} color={colors.accent} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>
                      Attach Photo(s)
                    </Text>
                  </TouchableOpacity>

                  {/* ── Thumbnail preview grid ─────────────────────── */}
                  {pickedAssets.length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={{ color: colors.subText, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                        Selected Photos — first will be used as product image
                      </Text>
                      <View style={styles.thumbGrid}>
                        {pickedAssets.map((asset, i) => (
                          <View key={i} style={styles.thumbItem}>
                            <Image
                              source={{ uri: asset.uri }}
                              style={styles.thumbImg}
                              resizeMode="cover"
                            />
                            {/* "PRIMARY" label on the first image */}
                            {i === 0 && (
                              <View style={styles.primaryBadge}>
                                <Text style={styles.primaryBadgeTxt}>PRIMARY</Text>
                              </View>
                            )}
                            {/* Remove button */}
                            <TouchableOpacity
                              style={styles.thumbRemove}
                              onPress={() => {
                                const next = pickedAssets.filter((_, j) => j !== i);
                                setPickedAssets(next);
                                // If we removed everything, clear the URI preview field
                                if (next.length === 0) setField('image_url')('');
                                else setField('image_url')(next[0].uri);
                              }}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Feather name="x" size={11} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={{ color: colors.subText, fontSize: 12, marginBottom: 10 }}>
                    or paste a URL below:
                  </Text>
                </>
              )}

              <FormField
                label={isAdmin ? 'Image URL (optional if photo attached)' : 'Image URL'}
                value={pickedAssets.length > 0 ? '' : form.image_url}
                onChange={v => {
                  setField('image_url')(v);
                  setImgPreviewErr(false);
                  if (v) setPickedAssets([]);  // switching to URL clears picked assets
                }}
                placeholder="https://... (paste a full image URL)"
                colors={colors}
                autoCapitalize="none"
              />

              {/* ── SECTION: Category ──────────────────────────────── */}
              <FormSection label="Category" />
              <View style={styles.pillRow}>
                {CATEGORIES.map(cat => {
                  const active = form.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pill,
                        { borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? colors.accent + '18' : 'transparent' },
                      ]}
                      onPress={() => setField('category')(active ? '' : cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        color: active ? colors.accent : colors.subText,
                        fontWeight: active ? '700' : '400',
                        fontSize: 13,
                        textTransform: 'capitalize',
                      }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <FormField
                label="Custom Category"
                value={form.category}
                onChange={setField('category')}
                placeholder="or type a custom value…"
                colors={colors}
                autoCapitalize="none"
              />

              {/* ── SECTION: Badge ─────────────────────────────────── */}
              <FormSection label="Badge" />
              <View style={styles.pillRow}>
                {BADGE_PRESETS.map(b => {
                  const active = form.badge === b.label;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      style={[
                        styles.pill,
                        { borderColor: b.color,
                          backgroundColor: active ? b.color : b.color + '18' },
                      ]}
                      onPress={() => { setField('badge')(b.label); setField('badgeColour')(b.color); }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        color: active ? '#fff' : b.color,
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 2 }}>
                  <FormField
                    label="Custom Badge Text"
                    value={form.badge}
                    onChange={setField('badge')}
                    placeholder="e.g. Limited"
                    colors={colors}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Colour (hex)"
                    value={form.badgeColour}
                    onChange={setField('badgeColour')}
                    placeholder="#008ADE"
                    colors={colors}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* ── Upload error ────────────────────────────────────── */}
              {uploadError !== null && (
                <View style={[styles.errorNote, { borderColor: '#FFCDD2' }]}>
                  <Feather name="alert-circle" size={14} color="#C62828" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#C62828', fontSize: 13, flex: 1 }}>{uploadError}</Text>
                </View>
              )}

              {/* ── Upload progress note ────────────────────────────── */}
              {uploading && (
                <View style={[styles.uploadNote, { backgroundColor: colors.inputBg }]}>
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 10 }} />
                  <Text style={{ color: colors.subText, fontSize: 13 }}>
                    Uploading image to server…
                  </Text>
                </View>
              )}

              {/* ── Save button ─────────────────────────────────────── */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: (saving || uploading) ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={saving || uploading}
              >
                {(saving || uploading)
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnTxt}>
                      {editing ? 'Save Changes' : 'Publish Product'}
                    </Text>
                }
              </TouchableOpacity>

              {/* ── Delete (edit mode only) ─────────────────────────── */}
              {editing && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: colors.danger }]}
                  onPress={() => {
                    closeModal();
                    setTimeout(() => handleDelete(editing), 350);
                  }}
                >
                  <Feather name="trash-2" size={15} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 14 }}>
                    Delete Product
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Product row card ─────────────────────────────────────────────────────────
function ProductRow({
  p, colors, onEdit, onDelete,
}: {
  p: Product;
  colors: any;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const imageUrl = getImageUrl(p.image_url);
  const showImg = Boolean(imageUrl && !imgErr);

  return (
    <View style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: colors.inputBg }]}>
        {showImg ? (
          <Image
            source={{ uri: imageUrl! }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            onError={() => setImgErr(true)}
          />
        ) : (
          <Feather name="package" size={22} color={colors.border} />
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={{ color: colors.accent, fontWeight: '800', marginTop: 1, fontSize: 14 }}>
          {p.price}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
          {p.category ? (
            <View style={[styles.catPill, { backgroundColor: colors.inputBg }]}>
              <Text style={{ color: colors.subText, fontSize: 11, textTransform: 'capitalize' }}>
                {p.category}
              </Text>
            </View>
          ) : null}
          {p.badge ? (
            <View style={[styles.badgePill, { backgroundColor: (p.badgeColour ?? '#008ADE') + '22' }]}>
              <Text style={{ color: p.badgeColour ?? '#008ADE', fontSize: 11, fontWeight: '700' }}>
                {p.badge}
              </Text>
            </View>
          ) : null}
          {p.rating ? (
            <Text style={{ color: colors.subText, fontSize: 11 }}>★ {p.rating}</Text>
          ) : null}
          {p.reviews ? (
            <Text style={{ color: colors.subText, fontSize: 11 }}>({String(p.reviews)} reviews)</Text>
          ) : null}
        </View>
        {/* Stock indicator */}
        <View style={[
          styles.stockPill,
          (p.stock_quantity ?? 0) === 0
            && { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
          (p.stock_quantity ?? 100) > 0 && (p.stock_quantity ?? 100) <= 10
            && { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
          (p.stock_quantity ?? 100) > 10
            && { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
        ]}>
          <Feather
            name="package"
            size={10}
            color={
              (p.stock_quantity ?? 0) === 0     ? '#B71C1C'
              : (p.stock_quantity ?? 100) <= 10 ? '#E65100'
              : '#2E7D32'
            }
          />
          <Text style={[
            styles.stockPillTxt,
            (p.stock_quantity ?? 0) === 0     && { color: '#B71C1C' },
            (p.stock_quantity ?? 100) > 0 && (p.stock_quantity ?? 100) <= 10 && { color: '#E65100' },
            (p.stock_quantity ?? 100) > 10 && { color: '#2E7D32' },
          ]}>
            {(p.stock_quantity ?? 0) === 0 ? 'Out' : `${p.stock_quantity ?? '?'} left`}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        onPress={() => onEdit(p)}
        style={styles.rowAction}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Feather name="edit-2" size={17} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onDelete(p)}
        style={styles.rowAction}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Feather name="trash-2" size={17} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
function FormSection({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function FormField({
  label, value, onChange, placeholder, colors, multiline, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  colors: any;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{
        color: colors.subText, marginBottom: 5, fontSize: 12,
        fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            color: colors.text,
            borderColor: colors.border,
            height: multiline ? 80 : 50,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : 0,
          },
        ]}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.subText}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  subHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 42, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1,
  },
  addFab: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 8, borderBottomWidth: 1,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  thumb: { width: 64, height: 64, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  stockPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
    marginTop: 5, alignSelf: 'flex-start',
  },
  stockPillTxt: { fontSize: 10, fontWeight: '700' },
  rowAction: { padding: 8, marginLeft: 2 },

  // Modal
  sheet: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  saveHeaderBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    minWidth: 72, height: 36, justifyContent: 'center', alignItems: 'center',
  },

  // Image preview in form header
  imgPreviewWrap: {
    width: '100%', height: 180, borderRadius: 14, overflow: 'hidden',
    marginBottom: 20, backgroundColor: '#F5F5F5',
  },
  imgPreview: { width: '100%', height: '100%' },
  imgPlaceholder: {
    width: '100%', height: 120, borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#888',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 24, marginBottom: 12,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },

  saveBtn: {
    height: 55, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  deleteBtn: {
    flexDirection: 'row', height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 12, borderWidth: 1.5,
  },

  // ── Image picker ──────────────────────────────────────────────────────────
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbItem: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(142,229,63,0.88)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  primaryBadgeTxt: { color: '#111', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadNote: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    marginTop: 12,
  },
  errorNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    marginTop: 4,
    borderWidth: 1,
  },
});
