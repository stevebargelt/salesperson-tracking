import { FC, useState, useEffect } from "react"
import { ViewStyle, TextStyle, Alert } from "react-native"
import Geolocation from '@react-native-community/geolocation'

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { useAuth } from "@/context/AuthContext"
import type { MainTabScreenProps } from "@/navigators/MainTabNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

// Import from local services and shared types
import { supabaseHelpers } from "@/services/SupabaseService"
import type { Account } from "@salesperson-tracking/types"

interface AccountsScreenProps extends MainTabScreenProps<"Accounts"> {}

interface AccountWithDistance extends Account {
  distance?: string;
  distanceValue?: number; // For sorting
}

export const AccountsScreen: FC<AccountsScreenProps> = () => {
  const [accounts, setAccounts] = useState<AccountWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const { authEmail } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  // Get user's current location
  const getCurrentLocation = (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // Cache location for 5 minutes
        }
      )
    })
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistanceFromCoords = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distance in miles
  }

  const fetchUserAccounts = async () => {
    if (!authEmail) return

    try {
      setLoading(true)
      
      // Get user's current location first
      let userLocation: {latitude: number, longitude: number} | null = null
      try {
        userLocation = await getCurrentLocation()
        setCurrentLocation(userLocation)
      } catch (locationError) {
        console.warn('Could not get current location, distances will not be available')
      }
      
      // Get the current Supabase user to get the real user ID
      const { data: { user }, error: userError } = await supabaseHelpers.getCurrentUser()
      
      if (userError || !user) {
        Alert.alert('Error', 'Please login again')
        return
      }

      // Get user accounts from Supabase using the real user ID
      const { data: userAccounts, error } = await supabaseHelpers.getUserAccounts(user.id)
      
      if (error) {
        console.error('Error fetching user accounts:', error)
        Alert.alert('Error', 'Failed to load accounts')
        return
      }

      if (userAccounts) {
        // Transform the data and add real distance calculations
        const accountsWithDistance = userAccounts.map((ua: any) => {
          const account = ua.accounts
          let distance = 'Unknown'
          let distanceValue = Infinity
          
          if (userLocation && account.latitude && account.longitude) {
            distanceValue = calculateDistanceFromCoords(
              userLocation.latitude,
              userLocation.longitude,
              account.latitude,
              account.longitude
            )
            
            if (distanceValue < 0.1) {
              distance = `${Math.round(distanceValue * 5280)} ft` // Show in feet if very close
            } else {
              distance = `${distanceValue.toFixed(1)} miles`
            }
          }
          
          return {
            ...account,
            distance,
            distanceValue
          }
        })
        
        // Sort by distance (closest first, unknown distances last)
        accountsWithDistance.sort((a, b) => a.distanceValue - b.distanceValue)
        
        setAccounts(accountsWithDistance)
      }
    } catch (error) {
      console.error('Error in fetchUserAccounts:', error)
      Alert.alert('Error', 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchUserAccounts()
  }, [authEmail])

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top"]}
    >
      <Text
        testID="accounts-heading"
        text="My Accounts"
        preset="heading"
        style={themed($heading)}
      />
      
      <Text
        text={loading 
          ? "Loading accounts..." 
          : currentLocation 
            ? `${accounts.length} assigned accounts • Sorted by distance`
            : `${accounts.length} assigned accounts • Enable location for distances`
        }
        preset="subheading"
        style={themed($subheading)}
      />

      {loading ? (
        <EmptyState
          content="Loading your assigned accounts..."
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          content="No accounts assigned. Contact your administrator to get accounts assigned to your profile."
        />
      ) : (
        accounts.map((account) => (
          <Card 
            key={account.id} 
            style={themed($accountCard)}
            heading={account.account_name}
            content={`${account.address}, ${account.city}, ${account.state}`}
            footer={`Distance: ${account.distance} • Geofence: ${account.geofence_radius}m`}
            headingStyle={themed($accountName)}
            contentStyle={themed($accountAddress)}
            footerStyle={themed($accountDistance)}
          />
        ))
      )}

      {accounts.length > 0 && (
        <Text
          text="Distances are calculated from your current location. The app will automatically detect when you enter the geofence radius of any assigned account."
          size="sm"
          style={themed($helpText)}
        />
      )}
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

const $accountCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  padding: spacing.lg,
})

const $accountName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $accountAddress: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.sm,
  color: colors.textDim,
})

const $accountDistance: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginBottom: spacing.xs,
  color: colors.tint,
})

const $geofenceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.secondary500,
})

const $helpText: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  marginTop: spacing.lg,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 18,
})