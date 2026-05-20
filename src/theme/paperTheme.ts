import { MD3DarkTheme } from 'react-native-paper';
import { colors } from './tokens';

export const planoraTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
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
