import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

const VERSION = '1.0.0';
const PRIVACY_URL = 'https://planora.app/privacy';
const TERMS_URL = 'https://planora.app/terms';

export const AboutScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.app}>Planora AI</Text>
    <Text style={styles.version}>Version {VERSION}</Text>
    <Text style={styles.tagline}>Goals, routines, and time — planned with AI.</Text>
    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
      <Text style={styles.link}>Privacy Policy</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
      <Text style={styles.link}>Terms of Service</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center' },
  app: { ...typography.h1, color: colors.text, marginTop: spacing.xl },
  version: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
  link: { ...typography.body, color: colors.primary, marginTop: spacing.md },
});
