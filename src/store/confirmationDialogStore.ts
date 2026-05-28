import { create } from 'zustand';

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type ConfirmationDialogState = {
  visible: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
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
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
  loading: false,
  onConfirm: null,

  show: (options) =>
    set({
      visible: true,
      title: options.title,
      message: options.message ?? '',
      itemName: options.itemName,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      destructive: options.destructive ?? false,
      loading: false,
      onConfirm: options.onConfirm,
    }),

  hide: () =>
    set({
      visible: false,
      loading: false,
      onConfirm: null,
    }),

  setLoading: (loading) => set({ loading }),
}));
