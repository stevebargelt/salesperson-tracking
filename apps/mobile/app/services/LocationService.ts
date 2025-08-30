import Geolocation, { GeolocationResponse, GeolocationError } from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './SupabaseService';
import { nativeLocationManager } from './NativeLocationManager';
import Constants from 'expo-constants';

interface QueuedLocationEvent {
  id: string;
  data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    event_type: 'significant_change' | 'high_accuracy' | 'background_sync';
    timestamp: string;
  };
  timestamp: number;
  retryCount: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private isTracking = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastLocationTime = 0;
  private userId: string | null = null;
  private useNativeModule = false; // Temporarily disabled - use React Native geolocation only
  private nativeListenerCleanup: (() => void) | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  // Start significant location change tracking
  async startTracking(): Promise<boolean> {
    try {
      if (this.isTracking) return true;

      if (!this.userId) {
        throw new Error('User not authenticated');
      }

      // Try native iOS module first for always-on tracking
      if (this.useNativeModule && nativeLocationManager.isAvailable()) {
        console.log('📍 Starting native iOS background location tracking...');
        
        const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
        const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
        
        const success = await nativeLocationManager.startBackgroundTracking(
          this.userId,
          supabaseUrl,
          supabaseKey
        );

        if (success) {
          // Set up listeners for native events
          this.setupNativeListeners();
          
          this.isTracking = true;
          
          // Start sync interval for any queued events from JS side
          this.syncInterval = setInterval(this.syncQueuedEvents.bind(this), 30000);

          console.log('📍 Native background location tracking started successfully');
          return true;
        } else {
          console.warn('⚠️ Native tracking failed, falling back to React Native geolocation');
        }
      }

      // Fallback to React Native geolocation
      return this.startReactNativeTracking();
      
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  // Fallback React Native location tracking (stops when app closes)
  private async startReactNativeTracking(): Promise<boolean> {
    console.log('📍 Starting React Native location tracking (foreground only)...');
    
    const config = {
      enableHighAccuracy: false,  // Use cell tower/WiFi for battery efficiency
      timeout: 0,                 // No timeout for background operation
      maximumAge: 300000,         // Accept 5-minute old readings
      distanceFilter: 500,        // ~500m minimum movement for SLC
    };

    // Start location tracking
    this.watchId = Geolocation.watchPosition(
      this.onLocationUpdate.bind(this),
      this.onLocationError.bind(this),
      config
    );

    this.isTracking = true;
    
    // Start sync interval for queued events
    this.syncInterval = setInterval(this.syncQueuedEvents.bind(this), 30000); // Every 30 seconds

    console.log('📍 React Native location tracking started');
    return true;
  }

  // Setup listeners for native location events
  private setupNativeListeners() {
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
    console.log('📍 All location tracking stopped');
  }

  // Handle location updates (SLC events)
  private async onLocationUpdate(position: GeolocationResponse) {
    try {
      // Prevent too frequent updates (minimum 2 minutes between events)
      const now = Date.now();
      if (now - this.lastLocationTime < 120000) {
        return;
      }
      this.lastLocationTime = now;

      if (!this.userId) return;

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 0,
        event_type: 'significant_change' as const,
        timestamp: new Date().toISOString(),
      };

      console.log('📍 New location event:', locationData);

      // Try to send immediately, queue if failed
      try {
        await this.sendLocationEvent(locationData);
        console.log('📍 Location event sent successfully');
      } catch (error) {
        console.log('📍 Failed to send immediately, queuing:', error);
        await this.queueLocationEvent(locationData);
      }
    } catch (error) {
      console.error('📍 Error processing location update:', error);
    }
  }

  private onLocationError(error: GeolocationError) {
    console.error('📍 Location error:', error);
  }

  // Send location event to server
  private async sendLocationEvent(data: any): Promise<void> {
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
  private async queueLocationEvent(data: any): Promise<void> {
    try {
      const event: QueuedLocationEvent = {
        id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingQueue = await AsyncStorage.getItem('location_queue');
      const queue: QueuedLocationEvent[] = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push(event);
      
      // Keep only last 100 events to prevent storage overflow
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }

      await AsyncStorage.setItem('location_queue', JSON.stringify(queue));
      console.log(`📍 Location event queued. Queue size: ${queue.length}`);
    } catch (error) {
      console.error('📍 Failed to queue location event:', error);
    }
  }

  // Sync queued events
  private async syncQueuedEvents(): Promise<void> {
    try {
      const existingQueue = await AsyncStorage.getItem('location_queue');
      if (!existingQueue) return;

      const queue: QueuedLocationEvent[] = JSON.parse(existingQueue);
      if (queue.length === 0) return;

      console.log(`📍 Syncing ${queue.length} queued events`);

      const successfulEvents: string[] = [];

      for (const event of queue) {
        try {
          await this.sendLocationEvent(event.data);
          successfulEvents.push(event.id);
          console.log(`📍 Synced event ${event.id}`);
        } catch (error) {
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
    } catch (error) {
      console.error('📍 Error syncing queued events:', error);
    }
  }

  // Force sync all queued events
  async forceSyncQueuedEvents(): Promise<void> {
    await this.syncQueuedEvents();
  }

  // Get current position
  async getCurrentPosition(): Promise<GeolocationResponse> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  // Get queue status
  async getQueueStatus(): Promise<{ queuedCount: number; oldestEvent: Date | null }> {
    try {
      const existingQueue = await AsyncStorage.getItem('location_queue');
      if (!existingQueue) {
        return { queuedCount: 0, oldestEvent: null };
      }

      const queue: QueuedLocationEvent[] = JSON.parse(existingQueue);
      const oldestEvent = queue.length > 0 ? new Date(Math.min(...queue.map(e => e.timestamp))) : null;
      
      return {
        queuedCount: queue.length,
        oldestEvent,
      };
    } catch (error) {
      console.error('📍 Error getting queue status:', error);
      return { queuedCount: 0, oldestEvent: null };
    }
  }

  // Clear all queued events
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem('location_queue');
      console.log('📍 Location queue cleared');
    } catch (error) {
      console.error('📍 Error clearing queue:', error);
    }
  }

  // Check if tracking is active
  getTrackingStatus(): boolean {
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
        return {
          ...basicStatus,
          native: {
            available: true,
            isTracking: nativeStatus.isTracking,
            authorizationStatus: nativeStatus.authorizationStatus,
            authorizationText: nativeLocationManager.getAuthorizationStatusText(nativeStatus.authorizationStatus),
            backgroundRefreshStatus: nativeStatus.backgroundRefreshStatus,
            significantLocationAvailable: nativeStatus.significantLocationAvailable,
          }
        };
      } catch (error) {
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
}

// Export singleton instance
export const locationService = LocationService.getInstance();