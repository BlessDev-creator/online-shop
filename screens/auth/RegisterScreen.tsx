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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = () => {
    setNameError(''); setEmailError(''); setPasswordError('');
    setConfirmPasswordError(''); setGeneralError('');
  };

  const validate = () => {
    clearErrors();
    let valid = true;
    if (!name.trim()) { setNameError('Full name is required.'); valid = false; }
    if (!email.trim()) {
      setEmailError('Email is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.'); valid = false;
    }
    if (!password) {
      setPasswordError('Password is required.'); valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.'); valid = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.'); valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.'); valid = false;
    }
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), role: 'user' } },
    });
    setLoading(false);

    if (error) {
      setGeneralError(error.message);
    } else if (data.session == null) {
      setGeneralError('Account created but email confirmation is required. Please check your inbox or disable email confirmation in Supabase Auth settings.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text, marginLeft: 20 }]}>Create Account</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 25 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.subText }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: nameError ? colors.danger : colors.border }]}
            placeholder="Your full name"
            placeholderTextColor={colors.subText}
            value={name}
            onChangeText={t => { setName(t); setNameError(''); }}
          />
          {nameError ? <Text style={[styles.errorText, { color: colors.danger }]}>{nameError}</Text> : null}

          <Text style={[styles.label, { color: colors.subText, marginTop: 15 }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: emailError ? colors.danger : colors.border }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={t => { setEmail(t); setEmailError(''); }}
          />
          {emailError ? <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text> : null}

          <Text style={[styles.label, { color: colors.subText, marginTop: 15 }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: passwordError ? colors.danger : colors.border }]}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={password}
            onChangeText={t => { setPassword(t); setPasswordError(''); }}
          />
          {passwordError ? <Text style={[styles.errorText, { color: colors.danger }]}>{passwordError}</Text> : null}

          <Text style={[styles.label, { color: colors.subText, marginTop: 15 }]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: confirmPasswordError ? colors.danger : colors.border }]}
            placeholder="Repeat your password"
            placeholderTextColor={colors.subText}
            secureTextEntry
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setConfirmPasswordError(''); }}
          />
          {confirmPasswordError ? <Text style={[styles.errorText, { color: colors.danger }]}>{confirmPasswordError}</Text> : null}

          {generalError ? (
            <View style={[styles.generalErrorBox, { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontSize: 14 }}>{generalError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.subText }}>
              Already have an account?{' '}
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Login</Text>
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
