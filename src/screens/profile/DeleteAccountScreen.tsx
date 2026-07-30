import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { showError, showSuccess } from '@/components/ConfirmationDialog';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Define the response type
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export const DeleteAccountScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState<'delete' | 'data' | null>(null);

  // Show confirmation dialog for account deletion
  const confirmDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount.deleteAccount.confirm.title'),
      t('deleteAccount.deleteAccount.confirm.message'),
      [
        {
          text: t('deleteAccount.deleteAccount.confirm.cancel'),
          style: 'cancel',
        },
        {
          text: t('deleteAccount.deleteAccount.confirm.confirm'),
          style: 'destructive',
          onPress: submitDeleteAccount,
        },
      ],
      { cancelable: true }
    );
  };

  // Show confirmation dialog for data deletion
  const confirmDeleteData = () => {
    Alert.alert(
      t('deleteAccount.deleteData.confirm.title'),
      t('deleteAccount.deleteData.confirm.message'),
      [
        {
          text: t('deleteAccount.deleteData.confirm.cancel'),
          style: 'cancel',
        },
        {
          text: t('deleteAccount.deleteData.confirm.confirm'),
          style: 'destructive',
          onPress: submitDeleteData,
        },
      ],
      { cancelable: true }
    );
  };

  const submitDeleteAccount = async () => {
    setLoading('delete');
    try {
      const response = await apiClient.delete<ApiResponse>('/me');
      
      console.log('Delete account response:', response);

      if (response.success) {
        showSuccess(
          t('deleteAccount.deleteAccount.success.title'),
          t('deleteAccount.deleteAccount.success.message')
        );
        await logout();
        // navigation.dispatch(
        //   CommonActions.reset({
        //     index: 0,
        //     routes: [{ name: 'Login' as never }],
        //   })
        // );
      } else {
        showError(
          t('common.error'),
          response.data?.message || t('deleteAccount.deleteAccount.error')
        );
      }
    } catch (e) {
      showError(t('common.error'), getApiErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const submitDeleteData = async () => {
    setLoading('data');
    try {
      const response = await apiClient.delete<ApiResponse>('/me/data');
      
      if (response.success) {
        showSuccess(
          t('deleteAccount.deleteData.success.title'),
          t('deleteAccount.deleteData.success.message')
        );
        navigation.goBack();
      } else {
        showError(
          t('common.error'),
          response.data?.message || t('deleteAccount.deleteData.error')
        );
      }
    } catch (e) {
      showError(t('common.error'), getApiErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
     

        {/* Warning Banner */}
        <View style={[styles.warningBanner, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <Icon name="alert-circle" size={24} color={colors.warning || '#FFB74D'} />
          <Text style={[styles.warningText, { textAlign: isArabic ? 'right' : 'left' }]}>
            {t('deleteAccount.warning')}
          </Text>
        </View>

        {/* Delete Account Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconContainer, styles.dangerIcon]}>
              <Icon name="account-remove" size={28} color="#fff" />
            </View>
            <View style={[styles.cardContent, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.cardTitle, { textAlign: isArabic ? 'right' : 'left' }]}>
                {t('deleteAccount.deleteAccount.title')}
              </Text>
              <Text style={[styles.cardDescription, { textAlign: isArabic ? 'right' : 'left' }]}>
                {t('deleteAccount.deleteAccount.description')}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={[styles.dataList, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.error} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteAccount.items.tasks')}
                </Text>
              </View>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.error} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteAccount.items.projects')}
                </Text>
              </View>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.error} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteAccount.items.profile')}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={confirmDeleteAccount}
              disabled={loading === 'delete'}
            >
              {loading === 'delete' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="delete-forever" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t('deleteAccount.deleteAccount.button')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Data Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconContainer, styles.warningIcon]}>
              <Icon name="database-remove" size={28} color="#fff" />
            </View>
            <View style={[styles.cardContent, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.cardTitle, { textAlign: isArabic ? 'right' : 'left' }]}>
                {t('deleteAccount.deleteData.title')}
              </Text>
              <Text style={[styles.cardDescription, { textAlign: isArabic ? 'right' : 'left' }]}>
                {t('deleteAccount.deleteData.description')}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={[styles.dataList, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.warning || '#FFB74D'} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteData.items.tasks')}
                </Text>
              </View>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.warning || '#FFB74D'} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteData.items.projects')}
                </Text>
              </View>
              <View style={[styles.dataItem, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <Icon name="check-circle" size={16} color={colors.warning || '#FFB74D'} />
                <Text style={[styles.dataItemText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {t('deleteAccount.deleteData.items.account')}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              onPress={confirmDeleteData}
              disabled={loading === 'data'}
            >
              {loading === 'data' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="database-remove" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t('deleteAccount.deleteData.button')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Footer */}
        <View style={[styles.footer, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <Icon name="shield-check" size={20} color={colors.textMuted} />
          <Text style={[styles.footerText, { textAlign: isArabic ? 'right' : 'left' }]}>
            {t('deleteAccount.footer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
  },
  warningText: {
    ...typography.caption,
    color: colors.warning || '#FFB74D',
    marginLeft: spacing.sm,
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dangerIcon: {
    backgroundColor: colors.error,
  },
  warningIcon: {
    backgroundColor: colors.warning || '#FFB74D',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  cardFooter: {
    marginTop: spacing.sm,
  },
  dataList: {
    marginBottom: spacing.md,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dataItemText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  warningButton: {
    backgroundColor: colors.warning || '#FFB74D',
  },
  actionButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginLeft: spacing.sm,
    flex: 1,
  },
});