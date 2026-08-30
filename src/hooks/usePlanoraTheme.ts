import { useTheme } from 'react-native-paper';

import { darkColors, lightColors, PlanoraColors } from '@/theme/tokens';

export const usePlanoraTheme = () => {
  const theme = useTheme();

  const colors: PlanoraColors = theme.dark
    ? darkColors
    : lightColors;

  return {
    ...theme,
    colors,
  };
};