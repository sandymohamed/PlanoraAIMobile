import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '@/theme/tokens';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const items = [
    { icon: 'account-edit-outline', label: 'Edit profile', route: 'EditProfile' },
    { icon: 'lock-outline', label: 'Change password', route: 'ChangePassword' },
    { icon: 'bell-outline', label: 'Notifications', route: 'NotificationSettings' },
    { icon: 'shield-account-outline', label: 'Privacy', route: 'PrivacySettings' },
    { icon: 'database-export-outline', label: 'Data export', route: 'DataExport' },
    { icon: 'help-circle-outline', label: 'Help & support', route: 'HelpSupport' },
    { icon: 'information-outline', label: 'About', route: 'About' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {items.map((item) => (
        <TouchableOpacity key={item.route} style={styles.row} onPress={() => navigation.navigate(item.route)}>
          <Icon name={item.icon} size={22} color={colors.primary} />
          <Text style={styles.label}>{item.label}</Text>
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  label: { ...typography.body, color: colors.text, flex: 1 },
});
