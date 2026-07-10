import { colors } from '@/theme/tokens';

/** Shared native-stack header options with RTL-aware title alignment. */
export const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleAlign: 'center' as const,
  headerBackTitleVisible: false,
};
