import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

interface BackgroundLocationManager {
  startBackgroundTracking(userId: string, supabaseUrl: string, supabaseKey: string): Promise<{status: string, message: string}>;
  stopBackgroundTracking(): Promise<{status: string, message: string}>;
  getTrackingStatus(): Promise<{
    isTracking: boolean;
    authorizationStatus: string;
    backgroundRefreshStatus: number;
    significantLocationAvailable: boolean;
  }>;
}

interface LocationUpdateEvent {
  user_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  event_type: string;
}

const { RNBackgroundLocationManager } = NativeModules as {
  RNBackgroundLocationManager: BackgroundLocationManager;
};

class NativeLocationManager {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: { [key: string]: any } = {};

  constructor() {
    if (Platform.OS === 'ios' && RNBackgroundLocationManager) {
      this.eventEmitter = new NativeEventEmitter(RNBackgroundLocationManager as any);
    }
  }

  // Start background location tracking with native iOS capabilities
  async startBackgroundTracking(userId: string, supabaseUrl: string, supabaseKey: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Native background location manager not available');
      return false;
    }

    try {
      const result = await RNBackgroundLocationManager.startBackgroundTracking(
        userId, 
        supabaseUrl, 
        supabaseKey
      );
      console.log('📍 Native background tracking started:', result);
      return result.status === 'started';
    } catch (error) {
      console.error('❌ Failed to start native background tracking:', error);
      return false;
    }
  }

  // Stop background location tracking
  async stopBackgroundTracking(): Promise<boolean> {
    if (!this.isAvailable()) {
      return true; // Already "stopped"
    }

    try {
      const result = await RNBackgroundLocationManager.stopBackgroundTracking();
      console.log('📍 Native background tracking stopped:', result);
      return result.status === 'stopped';
    } catch (error) {
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
    } catch (error) {
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
  onLocationUpdate(callback: (event: LocationUpdateEvent) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('onLocationUpdate', callback);
    this.listeners['onLocationUpdate'] = subscription;
    
    return () => {
      subscription.remove();
      delete this.listeners['onLocationUpdate'];
    };
  }

  // Listen for authorization changes
  onAuthorizationChanged(callback: (event: { status: string }) => void) {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener('onAuthorizationChanged', callback);
    this.listeners['onAuthorizationChanged'] = subscription;
    
    return () => {
      subscription.remove();
      delete this.listeners['onAuthorizationChanged'];
    };
  }

  // Listen for location errors
  onLocationError(callback: (event: { error: string }) => void) {
    if (!this.eventEmitter) return () => {};

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
  isAvailable(): boolean {
    return Platform.OS === 'ios' && !!RNBackgroundLocationManager;
  }

  // Get authorization status text
  getAuthorizationStatusText(status: string): string {
    switch (status) {
      case 'always': return 'Always (Perfect for background tracking)';
      case 'whenInUse': return 'When In Use (Limited background tracking)';
      case 'denied': return 'Denied (No location access)';
      case 'restricted': return 'Restricted (Parental controls)';
      case 'notDetermined': return 'Not Asked Yet';
      default: return `Unknown (${status})`;
    }
  }
}

// Export singleton instance
export const nativeLocationManager = new NativeLocationManager();