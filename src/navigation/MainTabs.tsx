import React from 'react';
import { Image, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TasksStack } from '@/navigation/TasksStack';
import { CalendarScreen } from '@/screens/calendar/CalendarScreen';
import { ProfileStack } from '@/navigation/ProfileStack';
import { colors, spacing } from '@/theme/tokens';
import { stackHeaderOptions } from '@/navigation/headerOptions';

const Tab = createBottomTabNavigator();
const logoImage = require('@/assets/logo.jpg');

export const MainTabs: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      detachInactiveScreens
      screenOptions={({ navigation }) => ({
        lazy: true,
        freezeOnBlur: true,
        headerShown: true,
        ...stackHeaderOptions,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text },
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.navigate('Home' as never)}
            style={{ marginStart: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel={t('navigation.goToHome')}
          >
            <Image source={logoImage} style={{ width: 40, height: 40, borderRadius: 10 }} />
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <Icon name="home-variant-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Always show the task list — opening a task from Home leaves TaskDetail on the stack.
            e.preventDefault();
            navigation.navigate('Tasks', { screen: 'TasksList' });
          },
        })}
        options={{
          title: t('navigation.tasks'),
          tabBarLabel: t('navigation.tasks'),
          tabBarIcon: ({ color, size }) => <Icon name="checkbox-marked-circle-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: t('navigation.calendar'),
          tabBarLabel: t('navigation.calendar'),
          tabBarIcon: ({ color, size }) => <Icon name="calendar-month-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('navigation.profile'),
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
