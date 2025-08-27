import { FC } from "react"
import { ViewStyle, TextStyle, Alert, View } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { ListItem } from "@/components/ListItem"
import { useAuth } from "@/context/AuthContext"
import { locationService } from "@/services/LocationService"
import { supabaseHelpers } from "@/services/SupabaseService"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface ProfileScreenProps extends MainTabScreenProps<"Profile"> {}

export const ProfileScreen: FC<ProfileScreenProps> = () => {
  const { authEmail, setAuthToken } = useAuth()
  const { stats } = useDashboardStats()
  
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            // Stop location tracking before signing out
            locationService.stopTracking()
            
            // Sign out from Supabase
            await supabaseHelpers.signOut()
            
            setAuthToken(undefined)
          },
        },
      ]
    )
  }

  const handleClearData = () => {
    Alert.alert(
      "Clear Local Data",
      "This will clear all locally stored data including queued location events. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            // Clear location service queue
            await locationService.clearQueue()
            Alert.alert("Data Cleared", "All local data has been cleared.")
          },
        },
      ]
    )
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
    >
      <Text
        testID="profile-heading"
        text="Profile"
        preset="heading"
        style={themed($heading)}
      />

      {/* User Info Card */}
      <Card 
        style={themed($card)}
        heading="Account Information"
        ContentComponent={
          <View>
            <ListItem
              text={`Email: ${authEmail}`}
              style={themed($listItem)}
            />
            
            <ListItem
              text="Role: Salesperson"
              style={themed($listItem)}
            />
            
            <ListItem
              text="Status: Active"
              style={themed($listItem)}
            />
          </View>
        }
      />

      {/* Settings Card */}
      <Card 
        style={themed($card)}
        heading="Settings"
        ContentComponent={
          <View>
            <ListItem
              text="Location Permissions: Always"
              style={themed($listItem)}
            />
            
            <ListItem
              text="Background App Refresh: Enabled"
              style={themed($listItem)}
            />
            
            <ListItem
              text="Notifications: Enabled" 
              style={themed($listItem)}
            />
          </View>
        }
      />

      {/* Statistics Card */}
      <Card 
        style={themed($card)}
        heading="Statistics"
        ContentComponent={
          <View>
            <ListItem
              text={stats.loading 
                ? "Total Visits: Loading..." 
                : `Total Visits: ${stats.totalVisits}`
              }
              style={themed($listItem)}
            />
            
            <ListItem
              text={stats.loading 
                ? "This Week: Loading..." 
                : stats.thisWeekVisits === 0 
                  ? "This Week: 0 visits" 
                  : `This Week: ${stats.thisWeekVisits} visits`
              }
              style={themed($listItem)}
            />
            
            <ListItem
              text={stats.loading 
                ? "Average Visit Duration: Loading..." 
                : stats.averageVisitDuration === 0 
                  ? "Average Visit Duration: N/A" 
                  : `Average Visit Duration: ${stats.averageVisitDuration} min`
              }
              style={themed($listItem)}
            />
          </View>
        }
      />

      {/* Action Buttons */}
      <Button
        text="Clear Local Data"
        style={themed($button)}
        preset="default"
        onPress={handleClearData}
      />

      <Button
        text="Sign Out"
        style={[themed($button), themed($signOutButton)]}
        textStyle={themed($signOutButtonText)}
        onPress={handleSignOut}
      />

      {/* App Info */}
      <Text
        text="Salesperson Tracker v1.0.0"
        size="sm"
        style={themed($appVersion)}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  padding: spacing.lg,
})


const $listItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $signOutButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
})

const $signOutButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $appVersion: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginTop: spacing.lg,
  color: colors.textDim,
  textAlign: "center",
})