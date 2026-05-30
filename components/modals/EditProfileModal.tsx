import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, StatusBar, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { UserProfile } from '../../types';

const ACCENT = '#8EE53F';

interface Props {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  session: Session | null;
  onSaved: () => Promise<void>;
}

export default function EditProfileModal({ visible, onClose, user, session, onSaved }: Props) {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Sync form state when modal opens
  useEffect(() => {
    if (visible) {
      setName(user?.full_name ?? '');
      setEmail(user?.email ?? session?.user?.email ?? '');
      setPreviewUri(user?.avatar_url ?? null);
    }
  }, [visible, user, session]);

  const currentEmail = (session?.user?.email ?? user?.email ?? '').toLowerCase();
  const emailChanged = email.trim().toLowerCase() !== currentEmail;

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const uploadAvatar = async (uri: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setUploading(true);
    setPreviewUri(uri); // optimistic local preview

    try {
      const response = await fetch(uri);
      const blob     = await response.blob();

      const filePath = `${userId}/avatar.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar_url: urlWithBust })
        .eq('id', userId);

      if (dbErr) throw dbErr;

      setPreviewUri(urlWithBust);
      await onSaved(); // refresh context so header updates immediately
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Could not upload image.');
      setPreviewUri(user?.avatar_url ?? null); // revert
    } finally {
      setUploading(false);
    }
  };

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
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
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
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.75,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Save profile details ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimName  = name.trim();
    const trimEmail = email.trim();

    if (!trimName) {
      Alert.alert('Required', 'Full name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const { error: nameErr } = await supabase
        .from('users')
        .update({ full_name: trimName })
        .eq('id', session!.user!.id);

      if (nameErr) throw nameErr;

      if (emailChanged) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: trimEmail });
        if (emailErr) throw emailErr;

        await onSaved();
        onClose();
        Alert.alert(
          'Verify New Email',
          `A confirmation link has been sent to ${trimEmail}.\n\nYour email will update once you click the link.`,
        );
        return;
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.full_name ?? session?.user?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* ── Sticky header ────────────────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Account</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { opacity: saving ? 0.55 : 1 }]}
              onPress={handleSave}
              disabled={saving || uploading}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnTxt}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Avatar section ───────────────────────────────────────── */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handleAvatarPress}
                style={styles.avatarWrap}
                activeOpacity={0.85}
                disabled={uploading}
              >
                {previewUri ? (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>{initials}</Text>
                  </View>
                )}

                {/* Camera badge */}
                <View style={styles.cameraBadge}>
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Feather name="camera" size={15} color="#fff" />
                  }
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>
                {uploading ? 'Uploading…' : 'Tap photo to change'}
              </Text>
            </View>

            {/* ── Form ─────────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Personal Details</Text>

            <FormField
              icon="user"
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Your full name"
              autoCapitalize="words"
            />
            <FormField
              icon="mail"
              label="Email Address"
              value={email}
              onChange={setEmail}
              placeholder="Your email"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {emailChanged && (
              <View style={styles.emailNote}>
                <Feather name="info" size={13} color="#E65100" style={{ marginRight: 7, marginTop: 1 }} />
                <Text style={styles.emailNoteTxt}>
                  Changing your email will send a verification link to{' '}
                  <Text style={{ fontWeight: '700' }}>{email.trim()}</Text>.
                  {' '}The change takes effect after you confirm it.
                </Text>
              </View>
            )}

            {/* ── Read-only: role ───────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Account Info</Text>
            <View style={styles.readOnlyRow}>
              <View style={styles.readOnlyIcon}>
                <Feather name="shield" size={16} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.readOnlyLabel}>Account Role</Text>
                <Text style={styles.readOnlyValue}>
                  {(user?.role ?? 'user').charAt(0).toUpperCase() + (user?.role ?? 'user').slice(1)}
                </Text>
              </View>
              <View style={[styles.rolePill, { backgroundColor: ACCENT + '22' }]}>
                <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '800' }}>
                  {(user?.role ?? 'user').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* ── Save button (bottom) ──────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.saveBtnBottom, { opacity: saving || uploading ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving || uploading}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnBottomTxt}>Save Changes</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────
function FormField({
  icon, label, value, onChange, placeholder, autoCapitalize, keyboardType,
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: any;
  keyboardType?: any;
}) {
  return (
    <View style={ff.wrap}>
      <Text style={ff.label}>{label}</Text>
      <View style={ff.row}>
        <Feather name={icon as any} size={17} color="#AAA" style={{ marginRight: 10 }} />
        <TextInput
          style={ff.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#C0C0C0"
          autoCapitalize={autoCapitalize ?? 'none'}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
    </View>
  );
}

const ff = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  row:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12, paddingHorizontal: 14, height: 52, backgroundColor: '#FAFAFA' },
  input: { flex: 1, fontSize: 15, color: '#111', paddingVertical: 0 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#fff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#000' },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 68,
  },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  body: { padding: 24, paddingBottom: 60 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap:    { position: 'relative' },
  avatarImg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarLetter: { fontSize: 42, fontWeight: '900', color: '#fff' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: { fontSize: 13, color: '#999', marginTop: 10 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // Email note
  emailNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  emailNoteTxt: { flex: 1, fontSize: 12, color: '#7A4100', lineHeight: 18 },

  // Read-only row
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  readOnlyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ACCENT + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4 },
  readOnlyValue: { fontSize: 14, fontWeight: '700', color: '#222', marginTop: 2 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  // Bottom save button
  saveBtnBottom: {
    backgroundColor: '#111',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnBottomTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
