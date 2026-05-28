import { useConfirmationDialogStore } from '@/store/confirmationDialogStore';
import type { ConfirmDialogOptions } from '@/store/confirmationDialogStore';

export function showConfirmDialog(options: ConfirmDialogOptions): void {
  useConfirmationDialogStore.getState().show(options);
}

export function showDeleteConfirmation(
  itemTitle: string,
  onConfirm: () => void | Promise<void>,
  entityLabel = 'task'
): void {
  showConfirmDialog({
    title: `Delete ${entityLabel}?`,
    itemName: itemTitle,
    message: 'This cannot be undone. All related data will be removed.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    destructive: true,
    onConfirm,
  });
}
