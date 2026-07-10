import { useConfirmationDialogStore } from '@/store/confirmationDialogStore';
import type { ConfirmDialogOptions, DialogVariant } from '@/store/confirmationDialogStore';
import { useActionSheetStore } from '@/store/actionSheetStore';
import type { ActionSheetOptions } from '@/store/actionSheetStore';
import i18n from '@/i18n';

export function showConfirmDialog(options: ConfirmDialogOptions): void {
  useConfirmationDialogStore.getState().show(options);
}

export function showDeleteConfirmation(
  itemTitle: string,
  onConfirm: () => void | Promise<void>,
  entityLabel = i18n.t('navigation.task')
): void {
  showConfirmDialog({
    title: i18n.t('dialogs.deleteTitle', { entity: entityLabel }),
    itemName: itemTitle,
    message: i18n.t('dialogs.deleteMessage'),
    confirmLabel: i18n.t('common.delete'),
    cancelLabel: i18n.t('common.cancel'),
    destructive: true,
    onConfirm,
  });
}

/**
 * Modern single-button alert card — replaces React Native's Alert.alert
 * for informational/success/error messages.
 */
export function showAlert(
  title: string,
  message?: string,
  options: { variant?: DialogVariant; confirmLabel?: string; onConfirm?: () => void | Promise<void> } = {}
): void {
  showConfirmDialog({
    title,
    message,
    alert: true,
    variant: options.variant ?? 'info',
    confirmLabel: options.confirmLabel ?? i18n.t('common.ok'),
    onConfirm: options.onConfirm,
  });
}

export function showSuccess(
  title: string,
  message?: string,
  onConfirm?: () => void | Promise<void>
): void {
  showAlert(title, message, { variant: 'success', onConfirm });
}

export function showError(title: string, message?: string): void {
  showAlert(title, message, { variant: 'error' });
}

/**
 * Modern bottom-sheet action menu — replaces multi-button Alert.alert menus.
 */
export function showActionSheet(options: ActionSheetOptions): void {
  useActionSheetStore.getState().show(options);
}
