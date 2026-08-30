import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { PlanoraColors, radius, spacing, shadows } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    elevated: {
      backgroundColor: colors.surfaceElevated,
      ...shadows.card,
    },
  });

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, elevated }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
};
