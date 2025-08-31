import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
const { RNBackgroundLocationManager } = NativeModules;
class NativeLocationManager {
    eventEmitter = null;
    listeners = {};
    constructor() {
        if (Platform.OS === 'ios' && RNBackgroundLocationManager) {
            this.eventEmitter = new NativeEventEmitter(RNBackgroundLocationManager);
        }
    }
    // Start background location tracking with native iOS capabilities
    async startBackgroundTracking(userId, supabaseUrl, supabaseKey, accessToken, refreshToken) {
        if (!this.isAvailable()) {
            console.warn('Native background location manager not available');
            return false;
        }
        try {
            const result = await RNBackgroundLocationManager.startBackgroundTracking(userId, supabaseUrl, supabaseKey, accessToken, refreshToken);
            console.log('📍 Native background tracking started:', result);
            return result.status === 'started';
        }
        catch (error) {
            console.warn('❌ Failed 5-arg native start, retrying legacy 4-arg:', error);
            try {
                const legacy = await RNBackgroundLocationManager.startBackgroundTrackingLegacy(userId, supabaseUrl, supabaseKey, accessToken);
                console.log('📍 Native background (legacy) tracking started:', legacy);
                return legacy.status === 'started';
            }
            catch (err2) {
                console.error('❌ Failed legacy native background tracking:', err2);
                return false;
            }
        }
    }
    // Stop background location tracking
    async stopBackgroundTracking() {
        if (!this.isAvailable()) {
            return true; // Already "stopped"
        }
        try {
            const result = await RNBackgroundLocationManager.stopBackgroundTracking();
            console.log('📍 Native background tracking stopped:', result);
            return result.status === 'stopped';
        }
        catch (error) {
            console.error('❌ Failed to stop native background tracking:', error);
            return false;
        }
    }
    // Get current status and permissions
    async getStatus() {
        if (!this.isAvailable()) {
            return {
                isTracking: false,
                authorizationStatus: 'unavailable',
                backgroundRefreshStatus: -1,
                significantLocationAvailable: false,
            };
        }
        try {
            return await RNBackgroundLocationManager.getTrackingStatus();
        }
        catch (error) {
            console.error('❌ Failed to get tracking status:', error);
            return {
                isTracking: false,
                authorizationStatus: 'error',
                backgroundRefreshStatus: -1,
                significantLocationAvailable: false,
            };
        }
    }
    // Listen for location updates from native module
    onLocationUpdate(callback) {
        if (!this.eventEmitter)
            return () => { };
        const subscription = this.eventEmitter.addListener('onLocationUpdate', callback);
        this.listeners['onLocationUpdate'] = subscription;
        return () => {
            subscription.remove();
            delete this.listeners['onLocationUpdate'];
        };
    }
    // Listen for authorization changes
    onAuthorizationChanged(callback) {
        if (!this.eventEmitter)
            return () => { };
        const subscription = this.eventEmitter.addListener('onAuthorizationChanged', callback);
        this.listeners['onAuthorizationChanged'] = subscription;
        return () => {
            subscription.remove();
            delete this.listeners['onAuthorizationChanged'];
        };
    }
    // Listen for location errors
    onLocationError(callback) {
        if (!this.eventEmitter)
            return () => { };
        const subscription = this.eventEmitter.addListener('onLocationError', callback);
        this.listeners['onLocationError'] = subscription;
        return () => {
            subscription.remove();
            delete this.listeners['onLocationError'];
        };
    }
    // Clean up all listeners
    removeAllListeners() {
        Object.values(this.listeners).forEach(subscription => {
            subscription.remove();
        });
        this.listeners = {};
    }
    // Check if native module is available
    isAvailable() {
        return Platform.OS === 'ios' && !!RNBackgroundLocationManager;
    }
    // Get authorization status text
    getAuthorizationStatusText(status) {
        switch (status) {
            case 'always': return 'Always (Perfect for background tracking)';
            case 'whenInUse': return 'When In Use (Limited background tracking)';
            case 'denied': return 'Denied (No location access)';
            case 'restricted': return 'Restricted (Parental controls)';
            case 'notDetermined': return 'Not Asked Yet';
            default: return `Unknown (${status})`;
        }
    }
    // Get native queue info
    async getQueueInfo() {
        if (!this.isAvailable()) {
            return { queueCount: 0, lastQueuedAt: null, lastFlushAt: null };
        }
        try {
            return await RNBackgroundLocationManager.getQueueInfo();
        }
        catch (e) {
            return { queueCount: 0, lastQueuedAt: null, lastFlushAt: null };
        }
    }
}
// Export singleton instance
export const nativeLocationManager = new NativeLocationManager();
//# sourceMappingURL=NativeLocationManager.js.map