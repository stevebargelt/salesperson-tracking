import { FC, useCallback, useEffect, useState } from "react"
import { ViewStyle, TextStyle, RefreshControl, AppState, AppStateStatus } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface DashboardScreenProps extends MainTabScreenProps<"Dashboard"> {}

export const DashboardScreen: FC<DashboardScreenProps> = () => {
  const { stats, refresh } = useDashboardStats()
  const [refreshing, setRefreshing] = useState(false)
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  // Refresh when screen gains focus and periodically while focused
  useFocusEffect(
    useCallback(() => {
      refresh()
      const iv = setInterval(refresh, 30000) // every 30s while focused
      return () => clearInterval(iv)
    }, [refresh])
  )

  // Refresh when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh()
    })
    return () => sub.remove()
  }, [refresh])

  const onPullToRefresh = async () => {
    try {
      setRefreshing(true)
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onPullToRefresh} />
        ),
      }}
    >
      <Text
        testID="dashboard-heading"
        text="Dashboard"
        preset="heading"
        style={themed($heading)}
      />
      
      <Text
        text="Personal Metrics & Insights"
        preset="subheading"
        style={themed($subheading)}
      />

      {/* Stats Cards */}
      <Card 
        style={themed($card)}
        heading="Today's Visits"
        content={stats.loading ? "Loading..." : stats.todayVisits.toString()}
        contentStyle={themed($statNumber)}
      />

      <Card 
        style={themed($card)}
        heading="Total Visit Time"
        content={stats.loading 
          ? "Loading..." 
          : stats.totalVisitHours === 0 
            ? "0 hours" 
            : `${stats.totalVisitHours} hours`
        }
        contentStyle={themed($statNumber)}
      />

      <Card 
        style={themed($card)}
        heading="This Week"
        content={stats.loading 
          ? "Loading..." 
          : stats.thisWeekVisits === 0 
            ? "0 visits" 
            : `${stats.thisWeekVisits} visits`
        }
        contentStyle={themed($statText)}
      />

      <Card 
        style={themed($card)}
        heading="Last Visit"
        content={stats.loading 
          ? "Loading..." 
          : stats.lastVisitDate || "No visits yet"
        }
        contentStyle={themed($statText)}
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


const $statNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})
