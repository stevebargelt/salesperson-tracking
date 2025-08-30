// CI shims to relax module resolution during TypeScript checks in CI
declare module 'expo-font';
declare module 'expo-linking';
declare module 'react-native-keyboard-controller';
declare module 'react-native-safe-area-context';
declare module 'react-native-mmkv';

declare module 'react-native-edge-to-edge' {
  export type SystemBarStyle = 'light' | 'dark' | 'auto'
  export interface SystemBarsProps { style?: SystemBarStyle }
  export const SystemBars: any
}

declare module 'expo-localization' {
  export type Locale = any
  const Localization: any
  export default Localization
}

declare module 'i18next' {
  export type TOptions = any
  const i18n: any
  export default i18n
}

declare module 'react-i18next' {
  export const initReactI18next: any
}

declare module '@react-navigation/native' {
  export type NavigatorScreenParams<T> = any
  export type CompositeScreenProps<A, B> = any
  export type NavigationState = any
  export function useNavigationContainerRef<T = any>(): any
}

declare module '@react-navigation/bottom-tabs' {
  export type BottomTabScreenProps<P, R> = any
  export function createBottomTabNavigator<T>(): any
}

declare module '@react-navigation/native-stack' {
  export type NativeStackScreenProps<P, R> = any
  export function createNativeStackNavigator<T>(): any
}
