import React from 'react';
import { Image, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TasksStack } from '@/navigation/TasksStack';
import { CalendarScreen } from '@/screens/calendar/CalendarScreen';
import { ProfileStack } from '@/navigation/ProfileStack';
import { colors } from '@/theme/tokens';

const Tab = createBottomTabNavigator();
const logoImage = require('@/assets/logo.jpg');

export const MainTabs: React.FC = () => (
  <Tab.Navigator
    detachInactiveScreens
    screenOptions={({ navigation }) => ({
      lazy: true,
      freezeOnBlur: true,
      headerShown: true,
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      headerTitleStyle: { color: colors.text },
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.navigate('Home' as never)}
          style={{ marginLeft: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
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
