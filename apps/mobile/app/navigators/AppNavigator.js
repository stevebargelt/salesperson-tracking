import { NavigationContainer, } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Config from "@/config";
import { useAuth } from "@/context/AuthContext";
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary";
import { LoginScreen } from "@/screens/LoginScreen";
import { useAppTheme } from "@/theme/context";
import { MainTabNavigator } from "./MainTabNavigator";
import { navigationRef, useBackButtonHandler } from "./navigationUtilities";
/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes;
// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator();
const AppStack = () => {
    const { isAuthenticated } = useAuth();
    const { theme: { colors }, } = useAppTheme();
    return (<Stack.Navigator screenOptions={{
            headerShown: false,
            navigationBarColor: colors.background,
            contentStyle: {
                backgroundColor: colors.background,
            },
        }} initialRouteName={isAuthenticated ? "Main" : "Login"}>
      
      {isAuthenticated ? (<>
          <Stack.Screen name="Main" component={MainTabNavigator}/>
        </>) : (<>
          <Stack.Screen name="Login" component={LoginScreen}/>
        </>)}
      
      {/** 🔥 Your screens go here */}
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>);
};
export const AppNavigator = (props) => {
    const { navigationTheme } = useAppTheme();
    useBackButtonHandler((routeName) => exitRoutes.includes(routeName));
    return (<NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>);
};
//# sourceMappingURL=AppNavigator.js.map