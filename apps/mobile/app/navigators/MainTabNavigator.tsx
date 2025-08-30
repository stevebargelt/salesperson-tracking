import { TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Icon } from "@/components/Icon"
import { DashboardScreen } from "@/screens/DashboardScreen"
import { TrackingScreen } from "@/screens/TrackingScreen"
import { AccountsScreen } from "@/screens/AccountsScreen"
import { VisitsScreen } from "@/screens/VisitsScreen"
import { ProfileScreen } from "@/screens/ProfileScreen"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"

export type MainTabParamList = {
  Dashboard: undefined
  Tracking: undefined
  Visits: undefined
  Accounts: undefined
  Profile: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

const Tab = createBottomTabNavigator<MainTabParamList>()

/**
 * This is the main navigator for the salesperson tracking app with a bottom tab bar.
 * Each tab represents a core feature of the app.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 * @returns {JSX.Element} The rendered `MainTabNavigator`.
 */
export function MainTabNavigator() {
  const { bottom } = useSafeAreaInsets()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: themed([$tabBar, { height: bottom + 70 }]),
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tintInactive,
        tabBarLabelStyle: themed($tabBarLabel),
        tabBarItemStyle: themed($tabBarItem),
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <Icon
              icon="menu" // We'll use existing icons for now
              color={focused ? colors.tint : colors.tintInactive}
              size={30}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{
          tabBarLabel: "Tracking",
          tabBarIcon: ({ focused }) => (
            <Icon
              icon="pin" // Location pin icon
              color={focused ? colors.tint : colors.tintInactive}
              size={30}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Visits"
        component={VisitsScreen}
        options={{
          tabBarLabel: "Visits",
          tabBarIcon: ({ focused }) => (
          <Icon
            icon="check"
            color={focused ? colors.tint : colors.tintInactive}
            size={30}
          />
          ),
        }}
      />

      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarLabel: "Accounts",
          tabBarIcon: ({ focused }) => (
            <Icon
              icon="community"
              color={focused ? colors.tint : colors.tintInactive}
              size={30}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <Icon
              icon="settings"
              color={focused ? colors.tint : colors.tintInactive}
              size={30}
            />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopColor: colors.border,
  borderTopWidth: 1,
})

const $tabBarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.md,
})

const $tabBarLabel: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  color: colors.text,
})
