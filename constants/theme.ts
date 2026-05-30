export const theme = {
  light: {
    background: '#FFFFFF', text: '#111111', subText: '#6B6B6B',
    card: '#FBFBFB', border: '#E6E6E6', tabBar: '#FFFFFF',
    searchBar: '#F3F8E9', inputBg: '#F8FAF2', accent: '#8EE53F', danger: '#E53935',
    brandGreen: '#8EE53F', brandGreenSoft: '#EAF9D9', gold: '#D9B17F', shadow: '#00000010',
  },
  dark: {
    background: '#121212', text: '#FFFFFF', subText: '#AAAAAA',
    card: '#1E1E1E', border: '#333333', tabBar: '#1B1B1B',
    searchBar: '#2C2C2C', inputBg: '#1E1E1E', accent: '#8EE53F', danger: '#EF5350',
    brandGreen: '#8EE53F', brandGreenSoft: '#164D06', gold: '#D9B17F', shadow: '#00000080',
  },
};

export const homeCategories = [
  { id: '1', name: 'Smart',      icon: 'watch-variant',       dbCategory: 'smart' },
  { id: '2', name: 'Audio',      icon: 'headphones',          dbCategory: 'audio' },
  { id: '3', name: 'Power',      icon: 'battery-charging-50', dbCategory: 'power' },
  { id: '4', name: 'Flash Sale', icon: 'tag-outline',         dbCategory: 'flash sale' },
  { id: '5', name: 'New In',     icon: 'new-box',             dbCategory: 'new' },
  { id: '6', name: 'NC EXCL',    icon: 'trophy-outline',      dbCategory: 'nc excl' },
  { id: '7', name: 'Check-In',   icon: 'calendar-check',      dbCategory: 'check-in' },
  { id: '8', name: 'APP Offer',  icon: 'cellphone-check',     dbCategory: 'app offer' },
];

const SUPABASE_STORAGE_BASE =
  'https://vmvunpsvhylnriworvsg.supabase.co/storage/v1/object/public/gadgets';

export function getImageUrl(urlOrFilename: string | null | undefined): string | null {
  if (!urlOrFilename) return null;
  if (urlOrFilename.startsWith('http')) return urlOrFilename;
  return `${SUPABASE_STORAGE_BASE}/${encodeURIComponent(urlOrFilename)}`;
}

export function parsePrice(price: string | null | undefined): number {
  if (!price) return 0;
  const n = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
