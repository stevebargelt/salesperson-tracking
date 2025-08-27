import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react"
// eslint-disable-next-line no-restricted-imports
import { TextInput, TextStyle, ViewStyle, Alert } from "react-native"

import { Button } from "@/components/Button"
import { PressableIcon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField, type TextFieldAccessoryProps } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { locationService } from "@/services/LocationService"
import { supabaseHelpers } from "@/services/SupabaseService"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import type { ThemedStyle } from "@/theme/types"
import { useAppTheme } from "@/theme/context"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = () => {
  const authPasswordInput = useRef<TextInput>(null)

  const [authPassword, setAuthPassword] = useState("")
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { authEmail, setAuthEmail, setAuthToken } = useAuth()

  const {
    themed,
    theme: { colors },
  } = useAppTheme()

  useEffect(() => {
    // Pre-fill with demo credentials for easier testing
    setAuthEmail("steve@harebrained-apps.com")
    setAuthPassword("")
  }, [setAuthEmail])

  async function login() {
    if (!authEmail || !authPassword) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)
    try {
      // Use real Supabase authentication
      const { data, error } = await supabaseHelpers.signIn(authEmail, authPassword)
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (data.user) {
        // Set user ID for location service
        locationService.setUserId(data.user.id)
        
        // Set auth token 
        setAuthToken(data.session?.access_token || String(Date.now()))
        
        Alert.alert("Login Successful", "Welcome to Salesperson Tracker!")
      } else {
        throw new Error("Authentication failed")
      }
    } catch (error) {
      Alert.alert("Login Failed", error instanceof Error ? error.message : "Authentication failed")
    }
    setIsLoading(false)
  }

  const PasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        )
      },
    [isAuthPasswordHidden, colors.palette.neutral800],
  )

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <Text testID="login-heading" text="Salesperson Tracker" preset="heading" style={themed($logIn)} />
      <Text text="Sign in to start location tracking" preset="subheading" style={themed($enterDetails)} />

      <TextField
        value={authEmail}
        onChangeText={setAuthEmail}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        placeholder="your@email.com"
        onSubmitEditing={() => authPasswordInput.current?.focus()}
      />

      <TextField
        ref={authPasswordInput}
        value={authPassword}
        onChangeText={setAuthPassword}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry={isAuthPasswordHidden}
        label="Password"
        placeholder="Password"
        onSubmitEditing={login}
        RightAccessory={PasswordRightAccessory}
      />

      <Button
        testID="login-button"
        text={isLoading ? "Signing In..." : "Sign In"}
        style={themed($tapButton)}
        preset="reversed"
        disabled={isLoading}
        onPress={login}
      />
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
})

const $logIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})


const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})


