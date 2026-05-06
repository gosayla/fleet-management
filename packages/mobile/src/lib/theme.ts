// ─── Design Tokens ─────────────────────────────────────────────────────────────

export const Colors = {
  // Brand – Figma teal (#247C76 from Visual Hierarchy guide)
  primary: '#247C76',
  primaryLight: '#E8F4F3',
  primaryDark: '#1B6159',

  // Semantic status
  success: '#22c55e',
  successLight: '#f0fdf4',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  info: '#3b82f6',
  infoLight: '#eff6ff',
  purple: '#8b5cf6',
  purpleLight: '#f5f3ff',
  orange: '#f97316',
  orangeLight: '#fff7ed',

  // Neutrals — flat, clean
  white: '#ffffff',
  bg: '#F7F8F9',
  card: '#ffffff',
  border: '#E4E8E8',
  borderLight: '#F0F4F4',

  // Text — Figma NeutralBase #333333
  textPrimary: '#1A1A1A',
  textSecondary: '#555F5E',
  textMuted: '#9CAEAC',
  textInverse: '#ffffff',

  // Tab
  tabBg: '#ffffff',
  tabActive: '#247C76',
  tabInactive: '#9CAEAC',
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Typography = {
  h1: {fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5},
  h2: {fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3},
  h3: {fontSize: 18, fontWeight: '600' as const},
  body: {fontSize: 15, fontWeight: '400' as const},
  bodyMd: {fontSize: 15, fontWeight: '500' as const},
  bodySm: {fontSize: 13, fontWeight: '400' as const},
  caption: {fontSize: 12, fontWeight: '400' as const},
  label: {fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5},
  btnLg: {fontSize: 16, fontWeight: '600' as const},
  btnSm: {fontSize: 14, fontWeight: '600' as const},
} as const;
