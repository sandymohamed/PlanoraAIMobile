import {
  MD3DarkTheme,
  MD3LightTheme,
  MD3Theme,
} from "react-native-paper";

import { darkColors, lightColors } from "./tokens";

export const createPlanoraTheme = (isDark: boolean): MD3Theme => {
  const colors = isDark ? darkColors : lightColors;
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...baseTheme,

    dark: isDark,

    roundness: 12,

    colors: {
      ...baseTheme.colors,

      primary: colors.primary,
      secondary: colors.accent,

      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceElevated,

      onBackground: colors.text,
      onSurface: colors.text,

      outline: colors.border,
    },
  };
};