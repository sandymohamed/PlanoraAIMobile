import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TasksStack } from '@/navigation/TasksStack';
import { CalendarScreen } from '@/screens/calendar/CalendarScreen';
import { ProfileStack } from '@/navigation/ProfileStack';
import { colors } from '@/theme/tokens';

const Tab = createBottomTabNavigator();

export const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.borderSubtle,
        height: 64,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => <Icon name="home-variant-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Tasks"
      component={TasksStack}
      options={{
        tabBarIcon: ({ color, size }) => <Icon name="checkbox-marked-circle-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Calendar"
      component={CalendarScreen}
      options={{
        tabBarIcon: ({ color, size }) => <Icon name="calendar-month-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStack}
      options={{
        tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);
