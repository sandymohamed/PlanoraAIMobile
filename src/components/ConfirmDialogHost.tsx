import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { AppIcon as Icon } from '@/components/ui/AppIcon';
import { useConfirmationDialogStore } from '@/store/confirmationDialogStore';
import { colors, spacing, typography, radius, shadows } from '@/theme/tokens';

export const ConfirmDialogHost: React.FC = () => {
  const {
    visible,
    title,
    message,
    itemName,
    confirmLabel,
    cancelLabel,
    destructive,
    loading,
    onConfirm,
    hide,
    setLoading,
  } = useConfirmationDialogStore();

  const handleConfirm = async () => {
    if (!onConfirm || loading) return;
    try {
      setLoading(true);
      await onConfirm();
      hide();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hide} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <View style={styles.card}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
            <Icon
              name={destructive ? 'trash-can-outline' : 'alert-circle-outline'}
              size={28}
              color={destructive ? colors.error : colors.primary}
            />
          </View>

          <Text style={styles.title}>{title}</Text>

          {itemName ? (
            <View style={styles.itemBox}>
              <Text style={styles.itemName} numberOfLines={2}>
                {itemName}
              </Text>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={hide}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDanger]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  itemBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmBtnDanger: {
    backgroundColor: colors.error,
  },
  confirmText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
