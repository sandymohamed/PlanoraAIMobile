//PlanoraMobile/src/theme/tokens.ts
/**
 * Planora AI design tokens
 * Premium minimal — supports dark & light themes
 */

export const darkColors = {
  background: "#0A0A0F",
  surface: "#12121A",
  surfaceElevated: "#1A1A24",
  border: "#2A2A38",
  borderSubtle: "#1E1E28",

  text: "#F4F4F8",
  textSecondary: "#9898A8",
  textMuted: "#6B6B7B",

  primary: "#7C6CF6",
  primarySoft: "rgba(124, 108, 246, 0.15)",
  accent: "#5EEAD4",
  accentSoft: "rgba(94, 234, 212, 0.12)",

  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  errorSoft: "rgba(248, 113, 113, 0.12)",
  gradientStart: "#7C6CF6",
  gradientEnd: "#5EEAD4",
};

export const lightColors = {
  background: "#F8F8FC",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  border: "#E4E4EC",
  borderSubtle: "#EEEEF3",

  text: "#17171F",
  textSecondary: "#666675",
  textMuted: "#9292A0",

  primary: "#6D5CE7",
  primarySoft: "rgba(109, 92, 231, 0.10)",

  accent: "#20B8A5",
  accentSoft: "rgba(32, 184, 165, 0.10)",

  success: "#22A95A",
  warning: "#D99500",

  error: "#E5484D",
  errorSoft: "rgba(229, 72, 77, 0.10)",

  gradientStart: "#6D5CE7",
  gradientEnd: "#20B8A5",
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
  hero: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },

  h1: {
    fontSize: 26,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },

  h2: {
    fontSize: 20,
    fontWeight: "600" as const,
  },

  h3: {
    fontSize: 17,
    fontWeight: "600" as const,
  },

  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },

  caption: {
    fontSize: 11,
    fontWeight: "400" as const,
  },

  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};

export type PlanoraColors = typeof darkColors | typeof lightColors;
