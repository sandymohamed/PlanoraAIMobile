import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showSuccess } from '@/components/ConfirmationDialog';
import {
  AppLanguage,
  setAppLanguage,
  supportedLanguages,
} from '@/i18n';
import { useRTL } from '@/hooks/useRTL';
import { colors, spacing, typography } from '@/theme/tokens';

export const LanguageSettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLanguage;
  const { directionalTextStyle: dirText } = useRTL();

  const changeLanguage = async (language: AppLanguage) => {
    if (language === currentLanguage) return;
    await setAppLanguage(language);
    const selected = supportedLanguages.find((item) => item.code === language);
    showSuccess(
      t('language.changedTitle'),
      t('language.changedMessage', { language: selected?.nativeLabel || language })
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, dirText()]}>{t('language.title')}</Text>
      <Text style={[styles.subtitle, dirText()]}>{t('language.subtitle')}</Text>

      <View style={styles.card}>
        {supportedLanguages.map((language) => {
          const selected = language.code === currentLanguage;
          return (
            <TouchableOpacity
              key={language.code}
              style={styles.languageRow}
              onPress={() => changeLanguage(language.code)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={styles.languageBody}>
                <Text style={[styles.languageLabel, dirText()]}>
                  {language.nativeLabel}
                </Text>
                <Text style={[styles.languageMeta, dirText()]}>
                  {language.label}
                </Text>
              </View>
              <Icon
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={selected ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.note, dirText()]}>{t('language.restartNote')}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  languageBody: { flex: 1 },
  languageLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  languageMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
});
