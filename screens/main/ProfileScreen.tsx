import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StatusBar, StyleSheet, Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';
import { Order, RootStackParamList } from '../../types';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';
import EditProfileModal from '../../components/modals/EditProfileModal';
import {
  WarrantyModal,
  ShippingModal,
  ContactUsModal,
  FeedbackModal,
} from '../../components/modals/ServiceModals';

type ServiceModal   = 'warranty' | 'shipping' | 'contact' | 'feedback' | null;

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLOR: Record<string, string> = {
  pending:   '#FF9800',
  confirmed: '#2196F3',
  shipped:   '#9C27B0',
  delivered: '#4CAF50',
  cancelled: '#F44336',
};

const STATUS_ICON: Record<string, string> = {
  pending:   'clock',
  confirmed: 'check-circle',
  shipped:   'truck',
  delivered: 'package',
  cancelled: 'x-circle',
};

const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES    = 5 * 1024 * 1024; // 5 MB

// ─── Action grid cell ─────────────────────────────────────────────────────────
function GridCell({
  label,
  icon,
  badge,
  colors,
  onPress,
}: {
  label: string;
  icon: string;
  badge?: number;
  colors: any;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={gStyles.cell} activeOpacity={0.75} onPress={onPress}>
      <View style={gStyles.iconWrap}>
        <MaterialCommunityIcons name={icon as any} size={22} color={colors.accent} />
        {badge !== undefined && badge > 0 && (
          <View style={gStyles.badge}>
            <Text style={gStyles.badgeTxt}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[gStyles.label, { color: colors.subText }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const gStyles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center' },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EAF9D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});

// ─── Wallet balance formatter (abbreviate for the stats chip) ────────────────
function fmtWalletShort(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { isDarkMode, user, session, refreshUser, walletBalance } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;
  const navigation = useNavigation<Nav>();

  const [orders, setOrders]               = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [sendingReset, setSendingReset]   = useState(false);
  const [serviceModal, setServiceModal]   = useState<ServiceModal>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setOrdersLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Avatar: quick-upload from header ──────────────────────────────────────
  const handleAvatarPress = () => {
    Alert.alert('Change Profile Photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Please allow camera access in your device settings.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.75,
          });
          if (!result.canceled && result.assets[0]) uploadAvatarUri(result.assets[0]);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Please allow photo library access in your device settings.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75,
          });
          if (!result.canceled && result.assets[0]) uploadAvatarUri(result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadAvatarUri = async (asset: ImagePicker.ImagePickerAsset) => {
    const userId = session?.user?.id;
    if (!userId) return;

    // Client-side validation
    if (asset.mimeType && !ALLOWED_AVATAR_MIME.includes(asset.mimeType)) {
      Alert.alert('Unsupported File', 'Please use a JPEG, PNG, or WebP image.');
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
      Alert.alert('File Too Large', `Image is ${(asset.fileSize / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB.`);
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await fetch(asset.uri);
      const blob     = await response.blob();
      const mime     = asset.mimeType ?? 'image/jpeg';
      const filePath = `${userId}/avatar.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: mime, upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', userId);
      if (dbErr) throw dbErr;

      await refreshUser();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Could not upload image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = user?.email ?? session?.user?.email;
    if (!email) return;
    Alert.alert('Reset Password', `A reset link will be sent to:\n${email}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: async () => {
          setSendingReset(true);
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'vortexshop://reset-password',
          });
          setSendingReset(false);
          if (error) Alert.alert('Error', error.message);
          else Alert.alert('Email Sent', `Check your inbox at ${email}.`);
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const initials = (user?.full_name ?? session?.user?.email ?? 'U').charAt(0).toUpperCase();
  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-GB', {
        month: 'long', year: 'numeric',
      })
    : null;

  const latestOrder = orders[0];
  const shippingSteps = [
    { key: 'pending', label: 'Placed', note: 'We got your order' },
    { key: 'confirmed', label: 'Packed', note: 'Ready for dispatch' },
    { key: 'shipped', label: 'On the way', note: 'Rider is moving' },
    { key: 'delivered', label: 'Delivered', note: 'Order completed' },
  ];
  const currentStepIndex = latestOrder
    ? shippingSteps.findIndex(step => step.key === latestOrder.status)
    : -1;
  const visibleStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const currentShippingStep = shippingSteps[visibleStepIndex] ?? shippingSteps[0];

  // Order grid — tapping navigates to OrderCenter with the right initial tab
  const orderGridItems = [
    {
      label: 'Unpaid',
      icon: 'wallet-outline',
      badge: orders.filter(o => o.status === 'pending').length,
      onPress: () => navigation.navigate('OrderCenter', { initialTab: 'Unpaid' }),
    },
    {
      label: 'Processing',
      icon: 'package-variant',
      badge: orders.filter(o => o.status === 'confirmed' || o.status === 'shipped').length,
      onPress: () => navigation.navigate('OrderCenter', { initialTab: 'Processing' }),
    },
    {
      label: 'Completed',
      icon: 'check-decagram-outline',
      badge: orders.filter(o => o.status === 'delivered').length,
      onPress: () => navigation.navigate('OrderCenter', { initialTab: 'Completed' }),
    },
    {
      label: 'Reviews',
      icon: 'star-outline',
      badge: 0,
      onPress: () => navigation.navigate('OrderCenter', { initialTab: 'All' }),
    },
  ];

  // Service grid — tapping opens the matching modal
  const serviceItems = [
    { label: 'Contact Us', icon: 'headset',              onPress: () => setServiceModal('contact') },
    { label: 'Warranty',   icon: 'shield-check-outline', onPress: () => setServiceModal('warranty') },
    { label: 'Shipping',   icon: 'truck-outline',        onPress: () => setServiceModal('shipping') },
    { label: 'Feedback',   icon: 'message-text-outline', onPress: () => setServiceModal('feedback') },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══ Green sweep header ══ */}
        <View style={styles.greenHeader}>
          {/* Decorative circles */}
          <View style={styles.decorC1} />
          <View style={styles.decorC2} />

          {/* Avatar + name */}
          <View style={styles.headerRow}>
            {/* Tappable avatar */}
            <TouchableOpacity
              onPress={handleAvatarPress}
              style={styles.avatarCircle}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <Text style={styles.avatarLetter}>{initials}</Text>
              )}
              {/* Camera badge overlay */}
              <View style={styles.cameraBadge}>
                {uploadingAvatar
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="camera" size={11} color="#fff" />
                }
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.hName}>{user?.full_name || 'User'}</Text>
              <Text style={styles.hEmail}>{user?.email ?? session?.user?.email}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleTxt}>
                  {(user?.role ?? 'user').toUpperCase()} ACCOUNT
                </Text>
              </View>
            </View>
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => navigation.navigate('AdminDashboard')}
              >
                <Feather name="settings" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Edit account link */}
          <TouchableOpacity style={styles.editRow} onPress={() => setEditModalOpen(true)}>
            <Text style={styles.editTxt}>Edit Your Account</Text>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* ══ Shipping progress card (replaces the old stats chips) ══ */}
        <View
          style={[
            styles.shippingCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.shippingHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shippingEyebrow, { color: colors.subText }]}>Shipping Tracker</Text>
              <Text style={[styles.shippingTitle, { color: colors.text }]}>Your delivery progress</Text>
            </View>
            <View style={styles.motorIllustration}>
              <View style={styles.motorBadge}>
                <MaterialCommunityIcons name="motorbike" size={24} color="#fff" />
              </View>
            </View>
          </View>

          <View style={styles.shippingBody}>
            <View style={styles.progressRail} />
            {shippingSteps.map((step, index) => {
              const isDone = index < visibleStepIndex;
              const isCurrent = index === visibleStepIndex;
              const isCancelled = latestOrder?.status === 'cancelled';
              return (
                <View key={step.key} style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      isDone && styles.progressDotDone,
                      isCurrent && !isCancelled && styles.progressDotCurrent,
                      isCancelled && styles.progressDotCancelled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        isDone
                          ? 'check'
                          : step.key === 'shipped'
                            ? 'truck-fast'
                            : step.key === 'confirmed'
                              ? 'package-variant'
                              : step.key === 'delivered'
                                ? 'home-variant'
                                : 'receipt'
                      }
                      size={12}
                      color={isDone || isCurrent ? '#fff' : colors.subText}
                    />
                  </View>
                  <View style={styles.progressTextWrap}>
                    <Text style={[styles.progressLabel, { color: colors.text }]}>{step.label}</Text>
                    <Text style={[styles.progressNote, { color: colors.subText }]}>{step.note}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.shippingFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.currentStepTitle, { color: colors.text }]}>
              {latestOrder
                ? `${latestOrder.id.slice(0, 8).toUpperCase()} · ${currentShippingStep.label}`
                : 'No active order yet'}
            </Text>
            <Text style={[styles.currentStepNote, { color: colors.subText }]}>
              {latestOrder
                ? latestOrder.status === 'cancelled'
                  ? 'This order has been cancelled.'
                  : currentShippingStep.note
                : 'Start shopping to see your shipping progress here.'}
            </Text>
          </View>
        </View>

        {/* ══ My Wallet card — tapping navigates to dedicated Wallet screen ══ */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => navigation.navigate('Wallet')}
          activeOpacity={0.88}
        >
          {/* Decorative circles */}
          <View style={styles.walletCircle1} />
          <View style={styles.walletCircle2} />

          {/* Top row */}
          <View style={styles.walletTopRow}>
            <View>
              <Text style={styles.walletLabel}>MY WALLET</Text>
              <Text style={styles.walletBalanceLabel}>Total Balance</Text>
            </View>
            <View style={styles.walletIconWrap}>
              <Feather name="credit-card" size={22} color="rgba(255,255,255,0.85)" />
            </View>
          </View>

          {/* Balance */}
          <Text style={styles.walletBalance}>
            UGX {walletBalance.toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          {/* CTA */}
          <View style={styles.depositBtn}>
            <Feather name="arrow-right-circle" size={15} color="#111" style={{ marginRight: 6 }} />
            <Text style={styles.depositBtnTxt}>Open Wallet →</Text>
          </View>
        </TouchableOpacity>

        {/* ══ My Orders grid card ══ */}
        <View
          style={[
            styles.gridCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.gridCardHdr}>
            <Text style={[styles.gridCardTitle, { color: colors.text }]}>My Orders</Text>
            <TouchableOpacity onPress={fetchOrders}>
              <Feather name="refresh-cw" size={15} color={colors.subText} />
            </TouchableOpacity>
          </View>
          <View style={styles.gridRow}>
            {orderGridItems.map(item => (
              <GridCell
                key={item.label}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                colors={colors}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>

        {/* ══ Official Service grid card ══ */}
        <View
          style={[
            styles.gridCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.gridCardTitle, { color: colors.text, marginBottom: 14 }]}>
            Official Service
          </Text>
          <View style={styles.gridRow}>
            {serviceItems.map(item => (
              <GridCell
                key={item.label}
                label={item.label}
                icon={item.icon}
                colors={colors}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>

        {/* ══ Member since strip ══ */}
        {memberSince && (
          <View style={[styles.infoStrip, { borderColor: colors.border }]}>
            <Feather name="calendar" size={13} color={colors.subText} />
            <Text style={[styles.infoStripTxt, { color: colors.subText }]}>
              Member since {memberSince}
            </Text>
          </View>
        )}

        {/* ══ Order history accordion ══ */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order History</Text>

          {ordersLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : orders.length === 0 ? (
            <View style={[styles.emptyOrders, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="shopping-bag" size={36} color={colors.border} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.subText, textAlign: 'center' }}>
                No orders yet. Start shopping!
              </Text>
            </View>
          ) : (
            orders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
                activeOpacity={0.8}
              >
                <View style={styles.orderHdr}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather
                      name={STATUS_ICON[order.status] as any}
                      size={15}
                      color={STATUS_COLOR[order.status]}
                      style={{ marginRight: 7 }}
                    />
                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: STATUS_COLOR[order.status] + '22' },
                    ]}
                  >
                    <Text
                      style={{
                        color: STATUS_COLOR[order.status],
                        fontSize: 12,
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                      }}
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ color: colors.subText, fontSize: 13 }}>
                    {formatDate(order.created_at)}
                  </Text>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                    UGX {Number(order.total).toLocaleString()}
                  </Text>
                </View>
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 2 }}>
                  {order.order_items?.length ?? 0} item(s)
                </Text>

                {expandedOrder === order.id &&
                  order.order_items &&
                  order.order_items.length > 0 && (
                    <View style={[styles.orderItems, { borderTopColor: colors.border }]}>
                      {order.order_items.map(item => (
                        <View key={item.id} style={styles.orderItemRow}>
                          <View style={[styles.itemDot, { backgroundColor: colors.accent }]} />
                          <Text
                            style={{ color: colors.text, flex: 1, fontSize: 13 }}
                            numberOfLines={1}
                          >
                            {item.product_name}
                          </Text>
                          <Text style={{ color: colors.subText, marginLeft: 8, fontSize: 13 }}>
                            ×{item.quantity}
                          </Text>
                          <Text
                            style={{
                              color: colors.accent,
                              marginLeft: 8,
                              fontWeight: '600',
                              fontSize: 13,
                            }}
                          >
                            {item.product_price}
                          </Text>
                        </View>
                      ))}
                      <View style={[styles.orderTotal, { borderTopColor: colors.border }]}>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                          Order Total
                        </Text>
                        <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 15 }}>
                          UGX {Number(order.total).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  )}

                <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                  <Feather
                    name={expandedOrder === order.id ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={colors.subText}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ══ Account settings ══ */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
            Account Settings
          </Text>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <Feather name="user" size={18} color={colors.subText} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ color: colors.subText, fontSize: 12 }}>Full Name</Text>
              <Text style={{ color: colors.text, fontWeight: '500', marginTop: 2 }}>
                {user?.full_name || '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <Feather name="mail" size={18} color={colors.subText} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ color: colors.subText, fontSize: 12 }}>Email Address</Text>
              <Text style={{ color: colors.text, fontWeight: '500', marginTop: 2 }}>
                {user?.email ?? session?.user?.email ?? '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderColor: colors.border }]}>
            <Feather name="shield" size={18} color={colors.subText} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ color: colors.subText, fontSize: 12 }}>Account Role</Text>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '500',
                  marginTop: 2,
                  textTransform: 'capitalize',
                }}
              >
                {user?.role ?? 'user'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border, opacity: sendingReset ? 0.6 : 1 }]}
            onPress={handlePasswordReset}
            disabled={sendingReset}
          >
            {sendingReset ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Feather name="lock" size={18} color={colors.accent} />
            )}
            <Text style={{ color: colors.accent, fontWeight: '600', marginLeft: 12, fontSize: 15 }}>
              {sendingReset ? 'Sending…' : 'Send Password Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══ Log Out ══ */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.danger + '44' }]}
          onPress={() =>
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log Out',
                style: 'destructive',
                onPress: () => supabase.auth.signOut(),
              },
            ])
          }
        >
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: 16, marginLeft: 10 }}>
            Log Out
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ══ Success toast ══ */}
      {toast !== null && (
        <View style={styles.successToast}>
          <Feather name="check-circle" size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.toastTxt} numberOfLines={2}>{toast}</Text>
        </View>
      )}

      {/* ══ Edit account modal ══ */}
      <EditProfileModal
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={user}
        session={session}
        onSaved={refreshUser}
      />

      {/* ══ Service modals ══ */}
      <WarrantyModal  visible={serviceModal === 'warranty'}  onClose={() => setServiceModal(null)} />
      <ShippingModal  visible={serviceModal === 'shipping'}  onClose={() => setServiceModal(null)} />
      <ContactUsModal visible={serviceModal === 'contact'}   onClose={() => setServiceModal(null)} />
      <FeedbackModal  visible={serviceModal === 'feedback'}  onClose={() => setServiceModal(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Green header
  greenHeader: {
    backgroundColor: '#8EE53F',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  decorC1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
    right: -55,
    top: -65,
  },
  decorC2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    left: -25,
    bottom: -40,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarLetter: { fontSize: 30, fontWeight: '900', color: '#8EE53F' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  hName: { fontSize: 20, fontWeight: '800', color: '#1F3D11', marginBottom: 2 },
  hEmail: { color: 'rgba(31,61,17,0.7)', fontSize: 12, marginBottom: 6 },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleTxt: { color: '#1F3D11', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  adminBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  editTxt: { color: 'rgba(31,61,17,0.85)', fontSize: 13, fontWeight: '600' },

  // Shipping tracker card
  shippingCard: {
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  shippingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shippingEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  shippingTitle: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  motorIllustration: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F2F8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  motorBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shippingBody: {
    position: 'relative',
    marginTop: 18,
    paddingLeft: 10,
  },
  progressRail: {
    position: 'absolute',
    left: 17,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#E7E7E7',
    borderRadius: 2,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F3F3',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressDotDone: {
    backgroundColor: '#2E7D32',
  },
  progressDotCurrent: {
    backgroundColor: '#8EE53F',
  },
  progressDotCancelled: {
    backgroundColor: '#F44336',
  },
  progressTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  progressLabel: { fontSize: 13, fontWeight: '700' },
  progressNote: { fontSize: 11, marginTop: 2 },
  shippingFooter: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  currentStepTitle: { fontSize: 13, fontWeight: '700' },
  currentStepNote: { fontSize: 12, marginTop: 4 },

  // My Wallet card
  walletCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#0F1923',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  walletCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -70,
    right: -50,
  },
  walletCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(142,229,63,0.08)',
    bottom: -40,
    left: -20,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  walletBalanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBalance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8EE53F',
    paddingVertical: 12,
    borderRadius: 12,
  },
  depositBtnTxt: { color: '#111', fontWeight: '800', fontSize: 14 },

  // Toast
  successToast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  toastTxt: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14, lineHeight: 19 },

  // Action grid cards
  gridCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  gridCardTitle: { fontSize: 16, fontWeight: '800' },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginTop: 16,
  },
  infoStripTxt: { fontSize: 13 },

  // Sections
  section: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },

  // Orders
  emptyOrders: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 10 },
  orderHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  orderItems: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  itemDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  // Account settings
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 50,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
});

