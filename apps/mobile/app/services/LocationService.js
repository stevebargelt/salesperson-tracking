import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseService';
import { nativeLocationManager } from './NativeLocationManager';
import Constants from 'expo-constants';
export class LocationService {
    static instance;
    watchId = null;
    isTracking = false;
    syncInterval = null;
    lastLocationTime = 0;
    userId = null;
    useNativeModule = true; // Enable native iOS module for always-on tracking
    nativeListenerCleanup = null;
    static TRACKING_PREF_KEY = 'tracking_enabled';
    constructor() {
        // Private constructor for singleton
    }
    static getInstance() {
        if (!LocationService.instance) {
            LocationService.instance = new LocationService();
        }
        return LocationService.instance;
    }
    setUserId(userId) {
        this.userId = userId;
    }
    // Start significant location change tracking
    async startTracking() {
        try {
            if (this.isTracking)
                return true;
            if (!this.userId) {
                throw new Error('User not authenticated');
            }
            // Try native iOS module first for always-on tracking
            if (this.useNativeModule && nativeLocationManager.isAvailable()) {
                console.log('📍 Starting native iOS background location tracking...');
                const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
                const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
                // Fetch current access token to pass to native module for RLS-authenticated REST calls
                // Try to obtain an access token (session may hydrate shortly after app start)
                let accessToken = undefined;
                let refreshToken = undefined;
                for (let i = 0; i < 3; i++) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        accessToken = session.access_token;
                        refreshToken = session.refresh_token;
                        break;
                    }
                    await new Promise((r) => setTimeout(r, 500));
                }
                // Also get refresh token (already captured if session present)
                if (!accessToken || !refreshToken) {
                    console.warn('⚠️ No Supabase access token available; cannot start native background tracking. Falling back to JS geolocation.');
                }
                else {
                    const success = await nativeLocationManager.startBackgroundTracking(this.userId, supabaseUrl, supabaseKey, accessToken, refreshToken);
                    if (success) {
                        // Set up listeners for native events
                        this.setupNativeListeners();
                        this.isTracking = true;
                        // Start sync interval for any queued events from JS side
                        this.syncInterval = setInterval(this.syncQueuedEvents.bind(this), 30000);
                        // Persist preference
                        await AsyncStorage.setItem(LocationService.TRACKING_PREF_KEY, 'true');
                        console.log('📍 Native background location tracking started successfully');
                        return true;
                    }
                    else {
                        console.warn('⚠️ Native tracking failed, falling back to React Native geolocation');
                    }
                }
            }
            // Fallback to React Native geolocation
            return this.startReactNativeTracking();
        }
        catch (error) {
            console.error('Failed to start location tracking:', error);
            return false;
        }
    }
    // Fallback React Native location tracking (stops when app closes)
    async startReactNativeTracking() {
        console.log('📍 Starting React Native location tracking (foreground only)...');
        const config = {
            enableHighAccuracy: false, // Use cell tower/WiFi for battery efficiency
            timeout: 0, // No timeout for background operation
            maximumAge: 300000, // Accept 5-minute old readings
            distanceFilter: 500, // ~500m minimum movement for SLC
        };
        // Start location tracking
        this.watchId = Geolocation.watchPosition(this.onLocationUpdate.bind(this), this.onLocationError.bind(this), config);
        this.isTracking = true;
        // Start sync interval for queued events
        this.syncInterval = setInterval(this.syncQueuedEvents.bind(this), 30000); // Every 30 seconds
        // Persist preference
        await AsyncStorage.setItem(LocationService.TRACKING_PREF_KEY, 'true');
        console.log('📍 React Native location tracking started');
        return true;
    }
    // Setup listeners for native location events
    setupNativeListeners() {
        // Clean up any existing listeners
        if (this.nativeListenerCleanup) {
            this.nativeListenerCleanup();
        }
        // Listen for location updates from native module
        const locationCleanup = nativeLocationManager.onLocationUpdate((event) => {
            console.log('📍 Native location update received:', event);
            // Native module handles saving to Supabase directly
            // This is just for logging/debugging
        });
        // Listen for authorization changes
        const authCleanup = nativeLocationManager.onAuthorizationChanged((event) => {
            console.log('📍 Authorization changed:', event.status);
        });
        // Listen for errors
        const errorCleanup = nativeLocationManager.onLocationError((event) => {
            console.error('📍 Native location error:', event.error);
        });
        // Store cleanup function
        this.nativeListenerCleanup = () => {
            locationCleanup();
            authCleanup();
            errorCleanup();
        };
    }
    // Stop location tracking
    async stopTracking() {
        // Stop native tracking if it's running
        if (this.useNativeModule && nativeLocationManager.isAvailable()) {
            await nativeLocationManager.stopBackgroundTracking();
        }
        // Clean up native listeners
        if (this.nativeListenerCleanup) {
            this.nativeListenerCleanup();
            this.nativeListenerCleanup = null;
        }
        // Stop React Native tracking
        if (this.watchId !== null) {
            Geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        // Stop sync interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isTracking = false;
        await AsyncStorage.setItem(LocationService.TRACKING_PREF_KEY, 'false');
        console.log('📍 All location tracking stopped');
    }
    // Handle location updates (SLC events)
    async onLocationUpdate(position) {
        try {
            // Prevent too frequent updates (minimum 2 minutes between events)
            const now = Date.now();
            if (now - this.lastLocationTime < 120000) {
                return;
            }
            this.lastLocationTime = now;
            if (!this.userId)
                return;
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy || 0,
                event_type: 'significant_change',
                timestamp: new Date().toISOString(),
            };
            console.log('📍 New location event:', locationData);
            // Persist last event time for status display
            try {
                await AsyncStorage.setItem('last_location_event_time', locationData.timestamp);
            }
            catch { }
            // Try to send immediately, queue if failed
            try {
                await this.sendLocationEvent(locationData);
                console.log('📍 Location event sent successfully');
            }
            catch (error) {
                console.log('📍 Failed to send immediately, queuing:', error);
                await this.queueLocationEvent(locationData);
            }
        }
        catch (error) {
            console.error('📍 Error processing location update:', error);
        }
    }
    onLocationError(error) {
        console.error('📍 Location error:', error);
    }
    // Send location event to server
    async sendLocationEvent(data) {
        if (!this.userId) {
            throw new Error('User not authenticated');
        }
        const locationEvent = {
            user_id: this.userId,
            timestamp: data.timestamp,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            event_type: data.event_type,
            detected_accounts: [], // Server-side processing handles account detection every 5 minutes
            processed: false,
        };
        const { error } = await supabase
            .from('location_events')
            .insert(locationEvent);
        if (error) {
            console.error('📍 Supabase insert error details:', error);
            throw new Error(`Failed to save location event: ${error.message}`);
        }
        console.log('📍 Location event saved successfully to Supabase');
    }
    // Queue location event for later sync
    async queueLocationEvent(data) {
        try {
            const event = {
                id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                data,
                timestamp: Date.now(),
                retryCount: 0,
            };
            const existingQueue = await AsyncStorage.getItem('location_queue');
            const queue = existingQueue ? JSON.parse(existingQueue) : [];
            queue.push(event);
            // Keep only last 100 events to prevent storage overflow
            if (queue.length > 100) {
                queue.splice(0, queue.length - 100);
            }
            await AsyncStorage.setItem('location_queue', JSON.stringify(queue));
            console.log(`📍 Location event queued. Queue size: ${queue.length}`);
        }
        catch (error) {
            console.error('📍 Failed to queue location event:', error);
        }
    }
    // Sync queued events
    async syncQueuedEvents() {
        try {
            const existingQueue = await AsyncStorage.getItem('location_queue');
            if (!existingQueue)
                return;
            const queue = JSON.parse(existingQueue);
            if (queue.length === 0)
                return;
            console.log(`📍 Syncing ${queue.length} queued events`);
            const successfulEvents = [];
            for (const event of queue) {
                try {
                    await this.sendLocationEvent(event.data);
                    successfulEvents.push(event.id);
                    console.log(`📍 Synced event ${event.id}`);
                }
                catch (error) {
                    event.retryCount++;
                    console.log(`📍 Failed to sync event ${event.id}, retry count: ${event.retryCount}`);
                    // Remove events that have failed too many times
                    if (event.retryCount > 5) {
                        successfulEvents.push(event.id);
                        console.log(`📍 Removing event ${event.id} after ${event.retryCount} failed attempts`);
                    }
                }
            }
            // Remove successfully synced events
            if (successfulEvents.length > 0) {
                const remainingQueue = queue.filter(event => !successfulEvents.includes(event.id));
                await AsyncStorage.setItem('location_queue', JSON.stringify(remainingQueue));
                console.log(`📍 Removed ${successfulEvents.length} events from queue. ${remainingQueue.length} remaining`);
            }
        }
        catch (error) {
            console.error('📍 Error syncing queued events:', error);
        }
    }
    // Force sync all queued events
    async forceSyncQueuedEvents() {
        await this.syncQueuedEvents();
    }
    // Get current position
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            });
        });
    }
    // Get queue status
    async getQueueStatus() {
        try {
            const existingQueue = await AsyncStorage.getItem('location_queue');
            if (!existingQueue) {
                // Also read last event time
                const last = await AsyncStorage.getItem('last_location_event_time');
                return { queuedCount: 0, oldestEvent: null, lastEvent: last ? new Date(last) : null };
            }
            const queue = JSON.parse(existingQueue);
            const oldestEvent = queue.length > 0 ? new Date(Math.min(...queue.map(e => e.timestamp))) : null;
            const last = await AsyncStorage.getItem('last_location_event_time');
            return {
                queuedCount: queue.length,
                oldestEvent,
                lastEvent: last ? new Date(last) : null,
            };
        }
        catch (error) {
            console.error('📍 Error getting queue status:', error);
            return { queuedCount: 0, oldestEvent: null, lastEvent: null };
        }
    }
    // Clear all queued events
    async clearQueue() {
        try {
            await AsyncStorage.removeItem('location_queue');
            console.log('📍 Location queue cleared');
        }
        catch (error) {
            console.error('📍 Error clearing queue:', error);
        }
    }
    // Check if tracking is active
    getTrackingStatus() {
        return this.isTracking;
    }
    // Get detailed status including native module info
    async getDetailedStatus() {
        const basicStatus = {
            isTracking: this.isTracking,
            userId: this.userId,
            lastUpdate: this.lastLocationTime,
            useNativeModule: this.useNativeModule,
        };
        if (nativeLocationManager.isAvailable()) {
            try {
                const nativeStatus = await nativeLocationManager.getStatus();
                const queueInfo = await nativeLocationManager.getQueueInfo();
                return {
                    ...basicStatus,
                    native: {
                        available: true,
                        isTracking: nativeStatus.isTracking,
                        authorizationStatus: nativeStatus.authorizationStatus,
                        authorizationText: nativeLocationManager.getAuthorizationStatusText(nativeStatus.authorizationStatus),
                        backgroundRefreshStatus: nativeStatus.backgroundRefreshStatus,
                        significantLocationAvailable: nativeStatus.significantLocationAvailable,
                        queueCount: queueInfo.queueCount,
                        lastQueuedAt: queueInfo.lastQueuedAt,
                        lastFlushAt: queueInfo.lastFlushAt,
                    }
                };
            }
            catch (error) {
                return {
                    ...basicStatus,
                    native: {
                        available: true,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                };
            }
        }
        return {
            ...basicStatus,
            native: {
                available: false,
                reason: 'iOS native module not available'
            }
        };
    }
    // Preference helpers
    async isTrackingEnabledPreference() {
        try {
            const v = await AsyncStorage.getItem(LocationService.TRACKING_PREF_KEY);
            return v === 'true';
        }
        catch {
            return false;
        }
    }
    // Attempt to auto-start tracking if user previously enabled it.
    async autoStartIfEnabled() {
        try {
            const enabled = await this.isTrackingEnabledPreference();
            if (!enabled)
                return;
            // Ensure we have a user id
            if (!this.userId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    this.userId = session.user.id;
                }
            }
            if (!this.userId)
                return; // wait until user is known
            await this.startTracking();
        }
        catch (e) {
            console.warn('📍 Auto-start tracking skipped:', e);
        }
    }
}
// Export singleton instance
export const locationService = LocationService.getInstance();
//# sourceMappingURL=LocationService.js.map