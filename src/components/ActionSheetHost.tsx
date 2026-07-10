import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon as Icon } from '@/components/ui/AppIcon';
import { useActionSheetStore } from '@/store/actionSheetStore';
import { colors, spacing, typography, radius, shadows } from '@/theme/tokens';
import { directionalTextStyle } from '@/utils/rtl';

export const ActionSheetHost: React.FC = () => {
  const { t } = useTranslation();
  const visible = useActionSheetStore((s) => s.visible);
  const title = useActionSheetStore((s) => s.title);
  const message = useActionSheetStore((s) => s.message);
  const options = useActionSheetStore((s) => s.options);
  const hide = useActionSheetStore((s) => s.hide);

  const handlePress = async (onPress?: () => void | Promise<void>) => {
    hide();
    await onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityRole="button" accessibilityLabel={t('common.dismiss')} />
        <View style={styles.sheet}>
          {(title || message) && (
            <View style={styles.header}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          )}

          {options.map((opt, idx) => (
            <TouchableOpacity
              key={`${opt.label}-${idx}`}
              style={[styles.option, idx === 0 && !(title || message) && styles.optionFirst]}
              activeOpacity={0.7}
              onPress={() => handlePress(opt.onPress)}
            >
              {opt.icon ? (
                <Icon name={opt.icon} size={22} color={opt.destructive ? colors.error : colors.text} />
              ) : null}
              <Text style={[styles.optionText, opt.destructive && styles.optionTextDanger, directionalTextStyle()]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={hide}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  optionFirst: {},
  optionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  optionTextDanger: {
    color: colors.error,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
