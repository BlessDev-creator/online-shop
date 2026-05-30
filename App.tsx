import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppProvider, useAppContext } from './context/AppContext';
import { RootStackParamList, TabParamList } from './types';
import { theme } from './constants/theme';

import AnimatedSplashScreen from './components/AnimatedSplashScreen';

// Custom line-art tab icons
import {
  HomeTabIcon,
  CategoriesTabIcon,
  CartTabIcon,
  ProfileTabIcon,
} from './components/icons/TabBarIcons';

// Auth screens
import AuthStartScreen     from './screens/auth/AuthStartScreen';
import LoginScreen         from './screens/auth/LoginScreen';
import RegisterScreen      from './screens/auth/RegisterScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';

// Main screens
import HomeScreen          from './screens/main/HomeScreen';
import CategoryScreen      from './screens/main/CategoryScreen';
import ProductDetailScreen from './screens/main/ProductDetailScreen';
import CartScreen          from './screens/main/CartScreen';
import ProfileScreen       from './screens/main/ProfileScreen';

// Order center
import OrderCenterScreen from './screens/orders/OrderCenterScreen';

// Wallet
import WalletScreen from './screens/main/WalletScreen';

// Admin screens
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// ─── Tab icon renderer ────────────────────────────────────────────────────────
function TabIcon({
  routeName,
  color,
  size,
}: {
  routeName: string;
  color: string;
  size: number;
}) {
  const s = size + 2; // slightly larger for custom icons to feel balanced
  switch (routeName) {
    case 'Home':     return <HomeTabIcon color={color} size={s} />;
    case 'Category': return <CategoriesTabIcon color={color} size={s} />;
    case 'Cart':     return <CartTabIcon color={color} size={s} />;
    case 'Profile':  return <ProfileTabIcon color={color} size={s} />;
    default:         return null;
  }
}

// ─── Bottom tabs ──────────────────────────────────────────────────────────────
function MainTabs() {
  const { isDarkMode, cartCount } = useAppContext();
  const colors = isDarkMode ? theme.dark : theme.light;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subText,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 3,
        },
        tabBarIcon: ({ color, size }) => (
          <TabIcon routeName={route.name} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Category" component={CategoryScreen} options={{ tabBarLabel: 'Browse' }} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#8EE53F', color: '#000', fontSize: 10, fontWeight: '800' },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { session, isAppLoading, isPasswordRecovery } = useAppContext();

  if (isAppLoading) {
    return <AnimatedSplashScreen onAnimationComplete={() => {}} />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {session ? (
        <>
          <Stack.Screen name="MainTabs"       component={MainTabs} />
          <Stack.Screen name="ProductDetails" component={ProductDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="OrderCenter"    component={OrderCenterScreen}   options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Wallet"         component={WalletScreen}         options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="AuthStart" component={AuthStartScreen} />
          <Stack.Screen name="Login"     component={LoginScreen} />
          <Stack.Screen name="Register"  component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
