import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '@/screens/profile/ChangePasswordScreen';
import { NotificationSettingsScreen } from '@/screens/profile/NotificationSettingsScreen';
import { PrivacySettingsScreen } from '@/screens/profile/PrivacySettingsScreen';
import { DataExportScreen } from '@/screens/profile/DataExportScreen';
import { HelpSupportScreen } from '@/screens/profile/HelpSupportScreen';
import { AboutScreen } from '@/screens/profile/AboutScreen';
import { colors } from '@/theme/tokens';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  DataExport: undefined;
  HelpSupport: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
    <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: 'Privacy' }} />
    <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Data & export' }} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ title: 'Help & support' }} />
    <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
  </Stack.Navigator>
);
