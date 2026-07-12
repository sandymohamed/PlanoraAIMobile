import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Image,
  I18nManager,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, typography } from "@/theme/tokens";

const VERSION = "1.0.0";
const CONTACT_EMAIL = "mailto:planora0ai@gmail.com";
const WEBSITE_URL = "https://planora-ai-landing-page.vercel.app";

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const handleContact = () => {
    Linking.openURL(CONTACT_EMAIL);
  };

  const handleWebsite = () => {
    Linking.openURL(WEBSITE_URL);
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* App Icon */}
      <View style={styles.iconContainer}>
        <Image
          source={require("@/assets/logo.jpg")} // Update path as needed
          style={styles.icon}
          resizeMode="contain"
        />
      </View>

      {/* App Info */}
      <Text style={[styles.appName, isRTL && styles.textRTL]}>Planora AI</Text>
      <Text style={[styles.version, isRTL && styles.textRTL]}>
        Version {VERSION}
      </Text>
      <Text style={[styles.tagline, isRTL && styles.textRTL]}>
        Goals, routines, and time — planned with AI.
      </Text>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={[styles.menuItem, isRTL && styles.menuItemRTL]}
          onPress={handleContact}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuText, isRTL && styles.textRTL]}>
            Contact
          </Text>
          <Text style={[styles.arrow, isRTL && styles.arrowRTL]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, isRTL && styles.menuItemRTL]}
          onPress={handleWebsite}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuText, isRTL && styles.textRTL]}>
            Website
          </Text>
          <Text style={[styles.arrow, isRTL && styles.arrowRTL]}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: "center",
  },
  containerRTL: {
    // RTL specific container styles if needed
  },
  iconContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    // shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    width: 70,
    height: 70,
  },
  appName: {
    ...typography.h1,
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 15,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  menuContainer: {
    width: "100%",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    // shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemRTL: {
    flexDirection: "row-reverse",
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  arrow: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 16,
  },
  arrowRTL: {
    transform: [{ scaleX: -1 }],
  },
});
