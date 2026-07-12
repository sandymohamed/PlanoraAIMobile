import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { LanguageSettingsScreen } from '@/screens/settings/LanguageSettingsScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '@/screens/profile/ChangePasswordScreen';
import { NotificationSettingsScreen } from '@/screens/profile/NotificationSettingsScreen';
import { PrivacySettingsScreen } from '@/screens/profile/PrivacySettingsScreen';
import { PrivacyPolicyScreen } from '@/screens/profile/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '@/screens/profile/TermsOfServiceScreen';
import { DataExportScreen } from '@/screens/profile/DataExportScreen';
import { HelpSupportScreen } from '@/screens/profile/HelpSupportScreen';
import { AboutScreen } from '@/screens/profile/AboutScreen';
import { colors } from '@/theme/tokens';
import { stackHeaderOptions } from '@/navigation/headerOptions';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  LanguageSettings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  DataExport: undefined;
  HelpSupport: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        ...stackHeaderOptions,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('navigation.settings') }} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ title: t('navigation.language') }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('navigation.editProfile') }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t('navigation.changePassword') }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t('navigation.notifications') }} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: t('navigation.privacy') }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: t('navigation.dataExport') }} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: t('navigation.helpSupport') }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t('navigation.about') }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('navigation.privacyPolicy') }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: t('navigation.termsOfService') }} />
   
    </Stack.Navigator>
  );
};
