export const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZWF3anlkdGRjdWJ3cmtsbnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDcxODMsImV4cCI6MjA4NDAyMzE4M30._XeWSMSZvTH2Q6Tr7Or8kBaKtkXsV35TfljLfUnZfhA';

/**
 * Default categories used when a new user is created.
 * These should match the database seed categories.
 */
export const DEFAULT_CATEGORIES = {
  income: [
    { name: 'Gaji', icon: '💰', color: '#10b981' },
    { name: 'Freelance', icon: '💻', color: '#6366f1' },
    { name: 'Investasi', icon: '📈', color: '#f59e0b' },
    { name: 'Hadiah', icon: '🎁', color: '#ec4899' },
    { name: 'Lainnya', icon: '📦', color: '#64748b' },
  ],
  expense: [
    { name: 'Makanan', icon: '🍔', color: '#ef4444' },
    { name: 'Transport', icon: '🚗', color: '#3b82f6' },
    { name: 'Belanja', icon: '🛒', color: '#8b5cf6' },
    { name: 'Tagihan', icon: '📄', color: '#f97316' },
    { name: 'Hiburan', icon: '🎬', color: '#ec4899' },
    { name: 'Kesehatan', icon: '🏥', color: '#14b8a6' },
    { name: 'Pendidikan', icon: '📚', color: '#6366f1' },
    { name: 'Rumah Tangga', icon: '🏠', color: '#a855f7' },
    { name: 'Lainnya', icon: '📦', color: '#64748b' },
  ],
  savings: [
    { name: 'Tabungan', icon: '🏦', color: '#6366f1' },
  ],
};

/**
 * Available emoji options for categories.
 */
export const ICON_OPTIONS = [
  '💰', '💵', '💳', '🏦', '📊', '📈', '💹',
  '🍔', '🍕', '☕', '🛒', '🛍️', '🚗', '🚌', '⛽', '🏠',
  '📱', '💻', '🎮', '📺', '🎵', '🎬', '📚', '🎓',
  '🏥', '💊', '🏋️', '🎁', '❤️', '✈️', '🏖️',
  '👶', '🐾', '📄', '⚡', '💡', '🔧', '📦',
];

/**
 * Available color options for categories and UI elements.
 */
export const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b',
];

/**
 * Account type labels for display.
 */
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: '🏦 Bank',
  ewallet: '📱 E-Wallet',
  investment: '📈 Investasi',
  other: '💰 Lainnya',
};

/**
 * Midtrans configuration (client-side).
 * NOTE: In production, move this to environment variables.
 */
export const MIDTRANS_CLIENT_KEY = 'Mid-client-0HUgAC-HEwe3Y1eX';
export const MIDTRANS_SNAP_URL = 'https://app.midtrans.com/snap/snap.js';
