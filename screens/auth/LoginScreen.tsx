import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../supabase';
import { RootStackParamList } from '../../types';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let valid = true;
    setEmailError(''); setPasswordError(''); setGeneralError('');

    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setGeneralError(error.message);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text, marginLeft: 20 }]}>Login</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 25 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.subText }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: emailError ? colors.danger : colors.border }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={t => { setEmail(t); setEmailError(''); setGeneralError(''); }}
          />
          {emailError ? <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text> : null}

          <Text style={[styles.label, { color: colors.subText, marginTop: 15 }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: passwordError ? colors.danger : colors.border }]}
            placeholder="••••••••"
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={password}
            onChangeText={t => { setPassword(t); setPasswordError(''); setGeneralError(''); }}
          />
          {passwordError ? <Text style={[styles.errorText, { color: colors.danger }]}>{passwordError}</Text> : null}

          {generalError ? (
            <View style={[styles.generalErrorBox, { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontSize: 14 }}>{generalError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Login</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.subText }}>
              Don't have an account?{' '}
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  title: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 14, marginBottom: 6 },
  input: { height: 55, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
  errorText: { fontSize: 13, marginTop: 4, marginLeft: 4 },
  generalErrorBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 15 },
  btn: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
