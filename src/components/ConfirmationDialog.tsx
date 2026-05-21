import { Alert } from 'react-native';

export function showDeleteConfirmation(title: string, onConfirm: () => void | Promise<void>) {
  Alert.alert('Delete task', `Delete "${title}"? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
}
