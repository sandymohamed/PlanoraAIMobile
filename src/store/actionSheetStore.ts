import { create } from 'zustand';

export type ActionSheetOption = {
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress?: () => void | Promise<void>;
};

export type ActionSheetOptions = {
  title?: string;
  message?: string;
  options: ActionSheetOption[];
};

type ActionSheetState = {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  show: (options: ActionSheetOptions) => void;
  hide: () => void;
};

export const useActionSheetStore = create<ActionSheetState>((set) => ({
  visible: false,
  title: undefined,
  message: undefined,
  options: [],

  show: (options) =>
    set({
      visible: true,
      title: options.title,
      message: options.message,
      options: options.options,
    }),

  hide: () => set({ visible: false, options: [] }),
}));
