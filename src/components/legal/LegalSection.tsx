// src/components/legal/LegalSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { I18nManager } from "react-native";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      marginHorizontal: spacing.md,
      // shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardRTL: {
      marginHorizontal: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.sm,
      fontSize: 18,
      fontWeight: "600",
    },
    textRTL: {
      textAlign: "right",
      writingDirection: "rtl",
    },
    content: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 24,
    },
  });

interface LegalSectionProps {
  title: string;
  content: string;
}

export const LegalSection: React.FC<LegalSectionProps> = ({
  title,
  content,
}) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.card, isRTL && styles.cardRTL]}>
      <Text style={[styles.title, isRTL && styles.textRTL]}>{title}</Text>
      <Text style={[styles.content, isRTL && styles.textRTL]}>{content}</Text>
    </View>
  );
};
