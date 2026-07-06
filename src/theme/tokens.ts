/**
 * Planora AI design tokens — dark-first, premium minimal
 * Inspiration: Linear, Notion, TickTick, Calm
 */
export const colors = {
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceElevated: '#1A1A24',
  border: '#2A2A38',
  borderSubtle: '#1E1E28',

  text: '#F4F4F8',
  textSecondary: '#9898A8',
  textMuted: '#6B6B7B',

  primary: '#7C6CF6',
  primarySoft: 'rgba(124, 108, 246, 0.15)',
  accent: '#5EEAD4',
  accentSoft: 'rgba(94, 234, 212, 0.12)',

  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',

  gradientStart: '#7C6CF6',
  gradientEnd: '#5EEAD4',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  hero: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '600' as const },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};
