import { FC, useCallback, useEffect, useState } from 'react'
import { Alert, View, ViewStyle, TextStyle } from 'react-native'

import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import type { MainTabScreenProps } from '@/navigators/MainTabNavigator'
import type { ThemedStyle } from '@/theme/types'
import { useAppTheme } from '@/theme/context'

import { locationService } from '@/services/LocationService'
import { nativeLocationManager } from '@/services/NativeLocationManager'
import { supabase } from '@/services/SupabaseService'

interface DebugScreenProps extends MainTabScreenProps<'Debug'> {}

export const DebugScreen: FC<DebugScreenProps> = () => {
  const { themed } = useAppTheme()

  const [userId, setUserId] = useState<string>('—')
  const [isTracking, setIsTracking] = useState<boolean>(false)
  const [prefEnabled, setPrefEnabled] = useState<boolean>(false)
  const [authStatus, setAuthStatus] = useState<string>('—')
  const [queueCount, setQueueCount] = useState<number>(0)
  const [lastQueuedAt, setLastQueuedAt] = useState<string>('—')
  const [lastFlushAt, setLastFlushAt] = useState<string>('—')
  const [lastHttpStatus, setLastHttpStatus] = useState<string>('—')

  const refresh = useCallback(async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session
      const uid = session?.user?.id
      if (uid) setUserId(uid)

      setIsTracking(locationService.getTrackingStatus())
      setPrefEnabled(await locationService.isTrackingEnabledPreference())

      const native = await nativeLocationManager.getStatus()
      setAuthStatus(nativeLocationManager.getAuthorizationStatusText(native.authorizationStatus))

      const qi = await nativeLocationManager.getQueueInfo()
      setQueueCount(qi.queueCount || 0)
      setLastQueuedAt(qi.lastQueuedAt ? new Date(qi.lastQueuedAt).toLocaleTimeString() : '—')
      setLastFlushAt(qi.lastFlushAt ? new Date(qi.lastFlushAt).toLocaleTimeString() : '—')
      setLastHttpStatus(typeof qi.lastStatusCode === 'number' ? String(qi.lastStatusCode) : '—')
    } catch (e) {}
  }, [])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 15000)
    return () => clearInterval(iv)
  }, [refresh])

  return (
    <Screen preset="auto" contentContainerStyle={themed($screen)} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Developer Tools" style={themed($heading)} />

      <Card heading="Identity" style={themed($card)} ContentComponent={
        <View>
          <Text text={`User ID: ${userId}`} style={themed($row)} />
        </View>
      } />

      <Card heading="Tracking" style={themed($card)} ContentComponent={
        <View>
          <Text text={`Tracking Active: ${isTracking ? 'Yes' : 'No'}`} style={themed($row)} />
          <Text text={`Tracking Pref: ${prefEnabled ? 'Enabled' : 'Disabled'}`} style={themed($row)} />
          <Text text={`Authorization: ${authStatus}`} style={themed($row)} />

          <View style={themed($btnRow)}>
            <Button text="Start Tracking" onPress={async () => { await locationService.startTracking(); await refresh(); }} />
            <Button text="Stop Tracking" onPress={async () => { await locationService.stopTracking(); await refresh(); }} />
          </View>
        </View>
      } />

      <Card heading="Native Queue" style={themed($card)} ContentComponent={
        <View>
          <Text text={`Count: ${queueCount}`} style={themed($row)} />
          <Text text={`Last Queued: ${lastQueuedAt}`} style={themed($row)} />
          <Text text={`Last Flush: ${lastFlushAt}`} style={themed($row)} />
          <Text text={`Last HTTP Status: ${lastHttpStatus}`} style={themed($row)} />

          <View style={themed($btnRow)}>
            <Button text="Flush Queue" onPress={async () => {
              const res = await locationService.flushNativeQueue()
              await refresh()
              Alert.alert('Native Flush', `Queued before: ${res.queuedBefore}\nQueued after: ${res.queuedAfter}`)
            }} disabled={queueCount === 0} />
            <Button text="Clear Queue" onPress={async () => {
              const res = await locationService.clearNativeQueue()
              await refresh()
              Alert.alert('Native Queue Cleared', `Removed ${res.cleared} items`) 
            }} disabled={queueCount === 0} />
          </View>
        </View>
      } />
    </Screen>
  )
}

const $screen: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  padding: spacing.lg,
})

const $row: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginBottom: spacing.xs,
  color: colors.textDim,
})

const $btnRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  gap: spacing.sm,
  marginTop: spacing.sm,
})

export default DebugScreen

