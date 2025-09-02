import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { registerRootComponent } from "expo"
import { wrap as sentryWrap } from "@sentry/react-native"

import { App } from "@/app"

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// Wrap the root component with Sentry to capture errors at the top level
registerRootComponent(sentryWrap(App))
