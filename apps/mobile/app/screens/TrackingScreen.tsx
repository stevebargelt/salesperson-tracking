import { FC, useState, useEffect, useRef, useCallback } from "react"
import { ViewStyle, TextStyle, Alert, View, AppState, AppStateStatus } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Switch } from "@/components/Toggle/Switch"
import { locationService } from "@/services/LocationService"
import { supabaseHelpers } from "@/services/SupabaseService"
import { nativeLocationManager } from "@/services/NativeLocationManager"
import { useAuth } from "@/context/AuthContext"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface TrackingScreenProps extends MainTabScreenProps<"Tracking"> {}

export const TrackingScreen: FC<TrackingScreenProps> = () => {
  const [isTracking, setIsTracking] = useState(false)
  const [queuedEvents, setQueuedEvents] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<string>("Never")
  const [nativeStatus, setNativeStatus] = useState<string>("Checking...")
  const [nativeQueue, setNativeQueue] = useState<string>("")
  const [nativeQueueCount, setNativeQueueCount] = useState<number>(0)
  const [lastHttpStatus, setLastHttpStatus] = useState<string>("—")
  
  const { authEmail } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    // Get the actual user UUID instead of email
    const setupUserTracking = async () => {
      if (authEmail) {
        try {
          const { data: { user } } = await supabaseHelpers.getCurrentUser()
          if (user) {
            locationService.setUserId(user.id) // Use actual UUID
          }
        } catch (error) {
          console.error('Failed to get current user:', error)
        }
      }
      setIsTracking(locationService.getTrackingStatus())
      updateQueueStatus()
    }

    setupUserTracking()

    // Update queue status every 30 seconds
    const interval = setInterval(updateQueueStatus, 30000)
    return () => clearInterval(interval)
  }, [authEmail])

  // Refresh when screen gains focus and subscribe to native events
  useFocusEffect(
    useCallback(() => {
      let focusInterval: ReturnType<typeof setInterval> | null = null

      // Kick an immediate refresh when focused
      updateQueueStatus()

      // Poll while focused
      focusInterval = setInterval(updateQueueStatus, 15000)

      // Subscribe to native events for more immediate updates
      const offLoc = nativeLocationManager.onLocationUpdate(() => {
        updateQueueStatus()
      })
      const offAuth = nativeLocationManager.onAuthorizationChanged((event) => {
        setNativeStatus(`Native: ${nativeLocationManager.getAuthorizationStatusText(event.status)}`)
      })

      return () => {
        if (focusInterval) clearInterval(focusInterval)
        offLoc?.()
        offAuth?.()
      }
    }, [])
  )

  // Refresh when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') updateQueueStatus()
    })
    return () => sub.remove()
  }, [])

  const updateQueueStatus = async () => {
    try {
      const status = await locationService.getQueueStatus()
      setQueuedEvents(status.queuedCount)
      if (status.lastEvent) {
        setLastUpdate(status.lastEvent.toLocaleTimeString())
      } else if (status.oldestEvent) {
        setLastUpdate(status.oldestEvent.toLocaleTimeString())
      }
      
      // Get detailed status including native module info
      const detailedStatus = await locationService.getDetailedStatus()
      if (detailedStatus.native.available) {
        if (detailedStatus.native.authorizationStatus) {
          setNativeStatus(`Native: ${detailedStatus.native.authorizationText}`)
        } else if (detailedStatus.native.error) {
          setNativeStatus(`Native: ${detailedStatus.native.error}`)
        }
        if (typeof detailedStatus.native.queueCount === 'number') {
          const q = detailedStatus.native.queueCount
          setNativeQueueCount(q)
          const lastQ = detailedStatus.native.lastQueuedAt ? new Date(detailedStatus.native.lastQueuedAt).toLocaleTimeString() : '—'
          const lastF = detailedStatus.native.lastFlushAt ? new Date(detailedStatus.native.lastFlushAt).toLocaleTimeString() : '—'
          setNativeQueue(`Native Queue: ${q} • Last Queued: ${lastQ} • Last Flush: ${lastF}`)
          if (typeof detailedStatus.native.lastStatusCode === 'number') {
            setLastHttpStatus(String(detailedStatus.native.lastStatusCode))
          }
        }
      } else {
        setNativeStatus(detailedStatus.native.reason || "Native: Not available")
        setNativeQueue("")
      }
    } catch (error) {
      console.error('Failed to get queue status:', error)
    }
  }

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await locationService.stopTracking()
        setIsTracking(false)
        Alert.alert("Tracking Stopped", "All location tracking (including background) has been disabled.")
      } else {
        const success = await locationService.startTracking()
        if (success) {
          setIsTracking(true)
          Alert.alert("Tracking Started", "Native iOS location tracking is now active. The app will track your location even when closed and automatically detect visits to assigned accounts.")
        } else {
          Alert.alert("Tracking Failed", "Unable to start location tracking. Please check permissions and ensure 'Always' location access is granted.")
        }
      }
      // Update status after toggling
      await updateQueueStatus()
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "An error occurred")
    }
  }

  const getCurrentLocation = async () => {
    try {
      const position = await locationService.getCurrentPosition()
      Alert.alert(
        "Current Location",
        `Lat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}\nAccuracy: ${position.coords.accuracy?.toFixed(0)}m`
      )
    } catch (error) {
      Alert.alert("Location Error", "Unable to get current location")
    }
  }

  const forceSync = async () => {
    try {
      await locationService.forceSyncQueuedEvents()
      await updateQueueStatus()
      Alert.alert("Sync Complete", "All queued location events have been synced")
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync queued events")
    }
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
    >
      <Text
        testID="tracking-heading"
        text="Location Tracking"
        preset="heading"
        style={themed($heading)}
      />
      
      <Text
        text="Manage your location tracking settings"
        preset="subheading"
        style={themed($subheading)}
      />

      {/* Tracking Control Card */}
      <Card 
        style={themed($card)}
        heading="Tracking Status"
        ContentComponent={
          <View>
            <Switch
              value={isTracking}
              onPress={toggleTracking}
              label="Location Tracking"
              labelStyle={themed($toggleLabel)}
            />

            <Text
              text={isTracking ? "Active" : "Stopped"}
              size="lg"
              weight="bold"
              style={[
                themed($statusText),
                { color: isTracking ? colors.palette.accent500 : colors.error }
              ]}
            />
          </View>
        }
      />

      {/* Status Information Card */}
      <Card 
        style={themed($card)}
        heading="Status Information"
        ContentComponent={
          <View>
            <Text text={`Queued Events: ${queuedEvents}`} style={themed($infoText)} />
            <Text text={`Last Update: ${lastUpdate}`} style={themed($infoText)} />
            <Text text={nativeStatus} style={themed($infoText)} />
            {nativeQueue ? (
              <Text text={nativeQueue} style={themed($infoText)} />
            ) : null}
            <Text text={`Last HTTP Status: ${lastHttpStatus}`} style={themed($infoText)} />
            <Text text="Battery Optimization: SLC Mode" style={themed($infoText)} />
          </View>
        }
      />

      {/* Action Buttons */}
      <Button
        text="Get Current Location"
        style={themed($button)}
        onPress={getCurrentLocation}
      />

      <Button
        text="Force Sync Events"
        style={themed($button)}
        preset="default"
        onPress={forceSync}
        disabled={queuedEvents === 0}
      />

      <Button
        text="Flush Native Queue"
        style={themed($button)}
        preset="default"
        onPress={async () => {
          const res = await locationService.flushNativeQueue()
          await updateQueueStatus()
          Alert.alert('Native Flush', `Queued before: ${res.queuedBefore}\nQueued after: ${res.queuedAfter}`)
        }}
        disabled={nativeQueueCount === 0}
      />

      <Button
        text="Clear Native Queue"
        style={themed($button)}
        preset="default"
        onPress={async () => {
          const res = await locationService.clearNativeQueue()
          await updateQueueStatus()
          Alert.alert('Native Queue Cleared', `Removed ${res.cleared} items from queue`)
        }}
        disabled={nativeQueueCount === 0}
      />
<<<<<<< HEAD

=======
>>>>>>> d80d974
      {/* Help Text */}
      <Text
        text="When tracking is enabled, the app will automatically detect when you visit assigned accounts using Significant Location Changes (SLC) for optimal battery life."
        size="sm"
        style={themed($helpText)}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $subheading: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.lg,
  color: colors.textDim,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  padding: spacing.lg,
})


const $toggleLabel: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
})

const $statusText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})

const $infoText: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.xs,
  color: colors.textDim,
})

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $helpText: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginTop: spacing.lg,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 18,
})
