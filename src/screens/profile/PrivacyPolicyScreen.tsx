// src/screens/settings/PrivacyPolicyScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  I18nManager,
} from "react-native";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { LegalSection } from "@/components/legal/LegalSection";
import privacyEN from "@/components/legal/privacy.en";
import privacyAR from "@/components/legal/privacy.ar";
import { useTranslation } from "react-i18next"; // Assuming you use i18n

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    containerRTL: {
      // RTL specific container styles if needed
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTitle: {
      ...typography.h1,
      color: colors.text,
      fontSize: 28,
      fontWeight: "700",
    },
    lastUpdated: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
      fontSize: 14,
    },
    textRTL: {
      textAlign: "right",
      writingDirection: "rtl",
    },
    introCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.lg,
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
      shadowColor: colors.border,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardRTL: {
      marginHorizontal: spacing.md,
    },
    introText: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 24,
    },
    onlineLink: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
      alignItems: "center",
    },
    onlineLinkText: {
      ...typography.body,
      color: colors.primary,
      fontSize: 15,
      fontWeight: "500",
    },
    footer: {
      height: spacing.xl,
    },
  });

const PRIVACY_ONLINE_URL = "https://planora-ai-landing-page.vercel.app/privacy";

export const PrivacyPolicyScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const { i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const currentLanguage = i18n.language || "en";

  const sections = currentLanguage === "ar" ? privacyAR : privacyEN;

  const handleViewOnline = () => {
    Linking.openURL(PRIVACY_ONLINE_URL);
  };

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.containerRTL]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, isRTL && styles.textRTL]}>
            Last updated: July 5, 2026
          </Text>
        </View>

        <View style={[styles.introCard, isRTL && styles.cardRTL]}>
          <Text style={[styles.introText, isRTL && styles.textRTL]}>
            Welcome to Planora AI ("Planora", "we", "our", or "us"). Your
            privacy is important to us. This Privacy Policy explains what
            information we collect, how we use it, how we protect it, and the
            choices you have regarding your personal information when using the
            Planora AI mobile application and website.
          </Text>
        </View>

        {sections.map((section, index) => (
          <LegalSection
            key={index}
            title={section.title}
            content={section.content}
          />
        ))}

        <TouchableOpacity
          style={styles.onlineLink}
          onPress={handleViewOnline}
          activeOpacity={0.7}
        >
          <Text style={[styles.onlineLinkText, isRTL && styles.textRTL]}>
            View latest version online →
          </Text>
        </TouchableOpacity>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};
