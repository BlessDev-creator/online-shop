import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthStart'>;

export default function AuthStartScreen({ navigation }: Props) {
  const { isDarkMode } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require('../../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, { color: colors.text }]}>Welcome to Vortex Shop</Text>
      <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 10 }}>
        Sign in to access the marketplace.
      </Text>

      <View style={{ width: '100%', marginTop: 40 }}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.accent, marginTop: 15 }]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={[styles.btnText, { color: colors.accent }]}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  logo: { width: 150, height: 150, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  btn: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
