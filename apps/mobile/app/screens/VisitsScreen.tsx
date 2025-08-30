import { FC, useCallback, useEffect, useState } from "react"
import { ViewStyle, TextStyle, RefreshControl, AppState, AppStateStatus } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { ListItem } from "@/components/ListItem"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"
import { supabase } from "@/services/SupabaseService"
import { formatDateTime, formatDuration } from "@salesperson-tracking/utils"

interface VisitsScreenProps extends MainTabScreenProps<"Visits"> {}

interface VisitRow {
  id: string
  check_in_time: string
  check_out_time: string | null
  duration_minutes: number | null
  account: { account_name: string; city?: string; state?: string } | null
}

export const VisitsScreen: FC<VisitsScreenProps> = () => {
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { themed } = useAppTheme()

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        setVisits([])
        return
      }

      const { data, error } = await supabase
        .from('visits')
        .select('id, check_in_time, check_out_time, duration_minutes, account:accounts(account_name, city, state)')
        .eq('user_id', user.id)
        .order('check_in_time', { ascending: false })
        .limit(50)

      if (error) throw error
      setVisits(data as any)
    } catch (e) {
      console.warn('Failed to load visits:', e)
      setVisits([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await fetchVisits()
    } finally {
      setRefreshing(false)
    }
  }, [fetchVisits])

  useFocusEffect(
    useCallback(() => {
      fetchVisits()
      const iv = setInterval(fetchVisits, 60000) // 60s while focused
      return () => clearInterval(iv)
    }, [fetchVisits])
  )

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') fetchVisits()
    })
    return () => sub.remove()
  }, [fetchVisits])

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ),
      }}
    >
      <Text
        testID="visits-heading"
        text="Recent Visits"
        preset="heading"
        style={themed($heading)}
      />

      {loading && (
        <Text text="Loading visits..." style={themed($subheading)} />
      )}

      {!loading && visits.length === 0 && (
        <Text text="No visits found." style={themed($subheading)} />
      )}

      {visits.map((v) => {
        const accountName = v.account?.account_name ?? 'Unknown Account'
        const subtitle = v.check_out_time
          ? `${formatDateTime(v.check_in_time)} • ${formatDuration(v.duration_minutes ?? 0)}`
          : `In progress • ${formatDateTime(v.check_in_time)}`

        return (
          <ListItem
            key={v.id}
            text={accountName}
            TextProps={{
              children: (
                <Text
                  text={accountName}
                  size="md"
                  weight="medium"
                  style={themed($itemTitle)}
                >
                  {undefined}
                </Text>
              ),
            }}
            RightComponent={<Text text={subtitle} size="xs" style={themed($itemSubtitle)} />}
            bottomSeparator
            height={64}
          />
        )
      })}
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
})

const $heading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $subheading: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $itemTitle: ThemedStyle<TextStyle> = ({}) => ({})
const $itemSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })

export default VisitsScreen

