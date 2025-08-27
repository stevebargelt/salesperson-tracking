import { FC } from "react"
import { ViewStyle, TextStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface DashboardScreenProps extends MainTabScreenProps<"Dashboard"> {}

export const DashboardScreen: FC<DashboardScreenProps> = () => {
  const { stats } = useDashboardStats()
  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
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