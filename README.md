# Vortex Shop

A full-featured e-commerce mobile application built with React Native (Expo) and Supabase. Vortex Shop delivers a complete shopping experience — from product discovery and cart management to order tracking and an in-app wallet — alongside a built-in admin panel for inventory and order management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/) SDK 54 |
| Language | TypeScript 5.9 |
| Backend & Database | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage) |
| Navigation | [React Navigation](https://reactnavigation.org/) v7 (Stack + Bottom Tabs) |
| State Management | React Context API + `useCallback`/`useMemo` |
| Persistence | [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage) |
| Icons | [@expo/vector-icons](https://docs.expo.dev/guides/icons/) (Feather, MaterialCommunityIcons) |
| Fonts | Google Sans via `@expo-google-fonts/google-sans` |
| Image Picker | `expo-image-picker` |
| Build & Distribution | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## Features

### Shopper
- **Authentication** — Email/password sign-up and login; password reset via deep-link email
- **Home Feed** — Rotating banner carousel (flash sales, new arrivals), category quick-links, and a featured products grid
- **Category Browser** — Dual-pane layout with category sidebar (Smart, Audio, Power, Gaming, Wearables, and more) and a filtered product list
- **Product Details** — Full product page with image, rating, flash-sale countdown timer, stock status, and add-to-cart
- **Shopping Cart** — Per-item quantity controls, checkbox selection, subtotal calculation, flash-sale upsell section, and one-tap checkout
- **Order Management** — Tabbed order history (All / Unpaid / Processing / Completed / Cancelled) with per-order actions:
  - **Cancel Order** — confirmation alert → Supabase status update → instant UI update
  - **Buy Again** — re-adds items to cart with live stock validation, then navigates to Cart
- **In-App Wallet** — Displays balance, supports deposits (Mobile Money, Card, Bank Transfer), and shows a transaction history
- **User Profile** — Avatar upload, editable name/email, quick-links to Orders, Wallet, Warranty, Shipping, Contact, and Feedback
- **Dark Mode** — Full light/dark theme toggle persisted per session

### Admin
- **Dashboard** — Live stat cards: total products, orders, revenue (UGX), and pending count
- **Product Management** — Add, edit, and delete products with image upload to Supabase Storage; configure badge, category, rating, and stock quantity
- **Order Management** — View all orders with user details and line items; update order status (Pending → Confirmed → Shipped → Delivered / Cancelled)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) or Yarn
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (`npm install -g expo-cli`)
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`) — for cloud builds only
- A [Supabase](https://supabase.com/) project with the tables described below
- [Expo Go](https://expo.dev/go) on your physical device, **or** an Android/iOS simulator

### 1. Clone the repository

```bash
git clone https://github.com/BlessDev-creator/online-shop.git
cd online-shop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Both values are available in your Supabase project under **Settings → API**.

### 4. Set up the Supabase database

Create the following tables in your Supabase project (SQL editor or Table editor):

```sql
-- Users (extended profile, created by a DB trigger on auth.users)
create table users (
  id uuid primary key references auth.users(id),
  full_name text,
  email text,
  role text default 'user',
  avatar_url text,
  wallet_balance numeric default 0,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price text,
  category text,
  image_url text,
  badge text,
  "badgeColour" text,
  rating text,
  reviews text,
  stock_quantity integer default 0,
  flash_sale boolean default false,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  status text default 'pending',
  total numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order Items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  product_id uuid references products(id),
  product_name text,
  product_price text,
  quantity integer default 1,
  created_at timestamptz default now()
);
```

Also create a **Storage bucket** named `product-images` (public) for product image uploads, and a bucket named `avatars` (public) for user avatar uploads.

### 5. Run the app locally

```bash
# Start the Expo development server
npm start

# Or target a platform directly
npm run android   # Android emulator / device
npm run ios       # iOS simulator (macOS only)
```

Scan the QR code with Expo Go, or press `a` / `i` in the terminal to open a simulator.

---

## Building for Distribution (EAS)

Builds are managed by Expo Application Services. The project ships with two profiles in `eas.json`:

| Profile | Output | Use case |
|---|---|---|
| `preview` | `.apk` | Internal testing on Android |
| `production` | `.aab` | Google Play Store submission |

```bash
# Install EAS CLI (once)
npm install -g eas-cli
eas login

# Build a testable APK
eas build --platform android --profile preview

# Build a production bundle
eas build --platform android --profile production
```

Build status and download links appear at **expo.dev** under your project.

---

## Project Structure

```
online-shop/
├── assets/                  # App icons, splash screen, favicon
├── components/
│   ├── icons/
│   │   └── TabBarIcons.tsx  # Custom line-art bottom-tab icons
│   ├── modals/
│   │   ├── EditProfileModal.tsx
│   │   ├── ServiceModals.tsx    # Warranty, Shipping, Contact, Feedback
│   │   └── WalletDepositModal.tsx
│   ├── AnimatedSplashScreen.tsx
│   ├── CartContent.tsx
│   ├── CartItemCard.tsx
│   └── ProductCard.tsx
├── constants/
│   └── theme.ts             # Color tokens, category config, image helpers
├── context/
│   └── AppContext.tsx        # Global state: auth, cart, wallet, theme
├── screens/
│   ├── admin/
│   │   ├── AdminDashboardScreen.tsx
│   │   ├── AdminOrdersTab.tsx
│   │   └── AdminProductsTab.tsx
│   ├── auth/
│   │   ├── AuthStartScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── ResetPasswordScreen.tsx
│   ├── main/
│   │   ├── CartScreen.tsx
│   │   ├── CategoryScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ProductDetailScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── WalletScreen.tsx
│   └── orders/
│       └── OrderCenterScreen.tsx
├── types/
│   └── index.ts             # Shared TypeScript interfaces (Product, Order, etc.)
├── App.tsx                  # Root navigator, auth gate, splash logic
├── app.json                 # Expo app config (bundle IDs, plugins, scheme)
├── eas.json                 # EAS Build profiles (preview APK, production AAB)
├── supabase.ts              # Supabase client initialisation
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase `anon` public API key |

Both variables are prefixed with `EXPO_PUBLIC_` so Expo can inline them at build time. **Never commit real credentials to version control** — add `.env` to `.gitignore`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

---

## License

This project is private and not licensed for public distribution.
