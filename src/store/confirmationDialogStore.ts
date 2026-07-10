import { create } from 'zustand';
import i18n from '@/i18n';

export type DialogVariant = 'info' | 'success' | 'error' | 'warning' | 'danger';

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirm (red). Equivalent to variant: 'danger' */
  destructive?: boolean;
  /** Visual style of the icon/accent */
  variant?: DialogVariant;
  /** Single-button informational/alert card (no cancel) */
  alert?: boolean;
  onConfirm?: () => void | Promise<void>;
};

type ConfirmationDialogState = {
  visible: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  variant: DialogVariant;
  alert: boolean;
  loading: boolean;
  onConfirm: (() => void | Promise<void>) | null;
  show: (options: ConfirmDialogOptions) => void;
  hide: () => void;
  setLoading: (loading: boolean) => void;
};

export const useConfirmationDialogStore = create<ConfirmationDialogState>((set) => ({
  visible: false,
  title: '',
  message: '',
  itemName: undefined,
  confirmLabel: i18n.t('common.confirm'),
  cancelLabel: i18n.t('common.cancel'),
  destructive: false,
  variant: 'info',
  alert: false,
  loading: false,
  onConfirm: null,

  show: (options) => {
    const destructive = options.destructive ?? options.variant === 'danger';
    set({
      visible: true,
      title: options.title,
      message: options.message ?? '',
      itemName: options.itemName,
      confirmLabel: options.confirmLabel ?? (options.alert ? i18n.t('common.ok') : i18n.t('common.confirm')),
      cancelLabel: options.cancelLabel ?? i18n.t('common.cancel'),
      destructive,
      variant: options.variant ?? (destructive ? 'danger' : 'info'),
      alert: options.alert ?? false,
      loading: false,
      onConfirm: options.onConfirm ?? null,
    });
  },

  hide: () =>
    set({
      visible: false,
      loading: false,
      onConfirm: null,
    }),

  setLoading: (loading) => set({ loading }),
}));
