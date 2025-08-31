import { useState, useEffect } from "react";
import { Alert, RefreshControl } from "react-native";
import Geolocation from '@react-native-community/geolocation';
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/context";
// Import from local services and shared types
import { supabaseHelpers } from "@/services/SupabaseService";
export const AccountsScreen = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const { authEmail } = useAuth();
    const { themed, theme: { colors }, } = useAppTheme();
    // Get user's current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition((position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, (error) => {
                console.error('Error getting current location:', error);
                reject(error);
            }, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000, // Cache location for 5 minutes
            });
        });
    };
    // Calculate distance between two coordinates using Haversine formula
    const calculateDistanceFromCoords = (lat1, lon1, lat2, lon2) => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in miles
    };
    const fetchUserAccounts = async () => {
        if (!authEmail)
            return;
        try {
            setLoading(true);
            // Get user's current location first
            let userLocation = null;
            try {
                userLocation = await getCurrentLocation();
                setCurrentLocation(userLocation);
            }
            catch (locationError) {
                console.warn('Could not get current location, distances will not be available');
            }
            // Get the current Supabase user to get the real user ID
            const { data: { user } } = await supabaseHelpers.getCurrentUser();
            if (!user) {
                // Not authenticated yet; skip fetch (screen will refresh when auth is available)
                return;
            }
            // Get user accounts from Supabase using the real user ID
            const { data: userAccounts, error } = await supabaseHelpers.getUserAccounts(user.id);
            if (error) {
                console.error('Error fetching user accounts:', error);
                Alert.alert('Error', 'Failed to load accounts');
                return;
            }
            if (userAccounts) {
                // Transform the data and add real distance calculations
                const accountsWithDistance = userAccounts.map((ua) => {
                    const account = ua.accounts;
                    let distance = 'Unknown';
                    let distanceValue = Infinity;
                    if (userLocation && account.latitude && account.longitude) {
                        distanceValue = calculateDistanceFromCoords(userLocation.latitude, userLocation.longitude, account.latitude, account.longitude);
                        if (distanceValue < 0.1) {
                            distance = `${Math.round(distanceValue * 5280)} ft`; // Show in feet if very close
                        }
                        else {
                            distance = `${distanceValue.toFixed(1)} miles`;
                        }
                    }
                    return {
                        ...account,
                        distance,
                        distanceValue
                    };
                });
                // Sort by distance (closest first, unknown distances last)
                accountsWithDistance.sort((a, b) => a.distanceValue - b.distanceValue);
                setAccounts(accountsWithDistance);
            }
        }
        catch (error) {
            console.error('Error in fetchUserAccounts:', error);
            Alert.alert('Error', 'Failed to load accounts');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchUserAccounts();
    }, [authEmail]);
    // Live updates: watch position and update distances as user moves
    useEffect(() => {
        let watchId = null;
        try {
            watchId = Geolocation.watchPosition((position) => {
                const loc = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                setCurrentLocation(loc);
                // Recalculate distances for existing accounts and resort
                setAccounts((prev) => {
                    if (!prev || prev.length === 0)
                        return prev;
                    const updated = prev.map((account) => {
                        let distance = 'Unknown';
                        let distanceValue = Infinity;
                        if (account.latitude && account.longitude) {
                            distanceValue = calculateDistanceFromCoords(loc.latitude, loc.longitude, account.latitude, account.longitude);
                            if (distanceValue < 0.1) {
                                distance = `${Math.round(distanceValue * 5280)} ft`;
                            }
                            else {
                                distance = `${distanceValue.toFixed(1)} miles`;
                            }
                        }
                        return { ...account, distance, distanceValue };
                    });
                    updated.sort((a, b) => (a.distanceValue ?? Infinity) - (b.distanceValue ?? Infinity));
                    return updated;
                });
            }, (error) => {
                console.warn('Accounts watcher location error:', error);
            }, {
                enableHighAccuracy: true,
                timeout: 0,
                maximumAge: 300000, // up to 5 minutes cached
                distanceFilter: 250, // refresh about every 250 meters
            });
        }
        catch (e) {
            console.warn('Failed to start Accounts location watcher:', e);
        }
        return () => {
            if (watchId !== null) {
                Geolocation.clearWatch(watchId);
            }
        };
    }, []);
    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await fetchUserAccounts();
        }
        finally {
            setRefreshing(false);
        }
    };
    return (<Screen preset="auto" contentContainerStyle={themed($screenContentContainer)} safeAreaEdges={["top"]} ScrollViewProps={{
            refreshControl: (<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>),
        }}>
      <Text testID="accounts-heading" text="My Accounts" preset="heading" style={themed($heading)}/>
      
      <Text text={loading
            ? "Loading accounts..."
            : currentLocation
                ? `${accounts.length} assigned accounts • Sorted by distance`
                : `${accounts.length} assigned accounts • Enable location for distances`} preset="subheading" style={themed($subheading)}/>

      {loading ? (<EmptyState content="Loading your assigned accounts..."/>) : accounts.length === 0 ? (<EmptyState content="No accounts assigned. Contact your administrator to get accounts assigned to your profile."/>) : (accounts.map((account) => (<Card key={account.id} style={themed($accountCard)} heading={account.account_name} content={`${account.address}, ${account.city}, ${account.state}`} footer={`Distance: ${account.distance} • Geofence: ${account.geofence_radius}m`} headingStyle={themed($accountName)} contentStyle={themed($accountAddress)} footerStyle={themed($accountDistance)}/>)))}

      {accounts.length > 0 && (<Text text="Distances are calculated from your current location. The app will automatically detect when you enter the geofence radius of any assigned account." size="sm" style={themed($helpText)}/>)}
    </Screen>);
};
const $screenContentContainer = ({ spacing }) => ({
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
});
const $heading = ({ spacing }) => ({
    marginBottom: spacing.sm,
});
const $subheading = ({ spacing, colors }) => ({
    marginBottom: spacing.lg,
    color: colors.textDim,
});
const $accountCard = ({ spacing }) => ({
    marginBottom: spacing.md,
    padding: spacing.lg,
});
const $accountName = ({ spacing }) => ({
    marginBottom: spacing.xs,
});
const $accountAddress = ({ spacing, colors }) => ({
    marginBottom: spacing.sm,
    color: colors.textDim,
});
const $accountDistance = ({ spacing, colors }) => ({
    marginBottom: spacing.xs,
    color: colors.tint,
});
const $geofenceText = ({ colors }) => ({
    color: colors.palette.secondary500,
});
const $helpText = ({ spacing, colors }) => ({
    marginTop: spacing.lg,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 18,
});
//# sourceMappingURL=AccountsScreen.js.map