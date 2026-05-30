import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

export default function ResetPasswordScreen() {
  const { isDarkMode, clearPasswordRecovery } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setPasswordError(''); setConfirmError('');
    if (password.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setConfirmError('Passwords do not match.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: clearPasswordRecovery },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 25 }}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '22' }]}>
            <Feather name="lock" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Set New Password</Text>
          <Text style={{ color: colors.subText, textAlign: 'center', marginBottom: 30 }}>
            Choose a strong password for your account.
          </Text>

          <Text style={[styles.label, { color: colors.subText }]}>New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: passwordError ? colors.danger : colors.border }]}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={password}
            onChangeText={t => { setPassword(t); setPasswordError(''); }}
          />
          {passwordError ? <Text style={[styles.error, { color: colors.danger }]}>{passwordError}</Text> : null}

          <Text style={[styles.label, { color: colors.subText, marginTop: 15 }]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: confirmError ? colors.danger : colors.border }]}
            placeholder="Repeat your password"
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={confirm}
            onChangeText={t => { setConfirm(t); setConfirmError(''); }}
          />
          {confirmError ? <Text style={[styles.error, { color: colors.danger }]}>{confirmError}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1, marginTop: 30 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { height: 55, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
  error: { fontSize: 13, marginTop: 4, marginLeft: 4 },
  btn: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
