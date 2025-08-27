import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@salesperson-tracking/supabase';
import type { LocationUpdateRequest, GeolocationPosition } from '@salesperson-tracking/types';

interface QueuedLocationEvent {
  id: string;
  data: LocationUpdateRequest;
  timestamp: number;
  retryCount: number;
}

export class LocationService {
  private watchId: number | null = null;
  private isTracking = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastLocationTime = 0;
  private userId: string | null = null;

  constructor() {
    this.setupAuth();
  }

  private async setupAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  // Start significant location change tracking
  async startTracking(): Promise<boolean> {
    try {
      if (this.isTracking) return true;

      // Ensure we have user ID
      if (!this.userId) {
        await this.setupAuth();
        if (!this.userId) {
          throw new Error('User not authenticated');
        }
      }

      // Configure for significant location changes
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

      console.log('📍 Location tracking started');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  // Stop location tracking
  stopTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isTracking = false;
    console.log('📍 Location tracking stopped');
  }

  // Handle location updates (SLC events)
  private async onLocationUpdate(position: GeolocationPosition) {
    try {
      // Prevent too frequent updates (minimum 2 minutes between events)
      const now = Date.now();
      if (now - this.lastLocationTime < 120000) {
        return;
      }
      this.lastLocationTime = now;

      if (!this.userId) return;

      const locationData: LocationUpdateRequest = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 100,
        event_type: 'significant_change',
        timestamp: new Date().toISOString()
      };

      console.log('📍 Significant Location Change:', {
        lat: locationData.latitude.toFixed(4),
        lng: locationData.longitude.toFixed(4),
        accuracy: locationData.accuracy
      });

      // Try to send immediately, queue if fails
      const success = await this.sendLocationEvent(locationData);
      if (!success) {
        await this.queueLocationEvent(locationData);
      }

    } catch (error) {
      console.error('Error processing location update:', error);
    }
  }

  private onLocationError(error: any) {
    console.error('Location error:', error);
  }

  // Send location event to backend
  private async sendLocationEvent(data: LocationUpdateRequest): Promise<boolean> {
    try {
      if (!this.userId) return false;

      const { error } = await supabase
        .from('location_events')
        .insert({
          user_id: this.userId,
          timestamp: data.timestamp,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          event_type: data.event_type
        });

      if (error) throw error;

      console.log('✅ Location event sent to server');
      return true;
    } catch (error) {
      console.error('Failed to send location event:', error);
      return false;
    }
  }

  // Queue location event for later sending
  private async queueLocationEvent(data: LocationUpdateRequest) {
    try {
      const queuedEvent: QueuedLocationEvent = {
        id: `${Date.now()}-${Math.random()}`,
        data,
        timestamp: Date.now(),
        retryCount: 0
      };

      // Get existing queue
      const existing = await this.getQueuedEvents();
      const updated = [...existing, queuedEvent];

      // Limit queue size
      if (updated.length > 100) {
        updated.splice(0, updated.length - 100);
      }

      await AsyncStorage.setItem('location_queue', JSON.stringify(updated));
      console.log('📦 Location event queued for later sync');
    } catch (error) {
      console.error('Failed to queue location event:', error);
    }
  }

  // Get queued events from storage
  private async getQueuedEvents(): Promise<QueuedLocationEvent[]> {
    try {
      const stored = await AsyncStorage.getItem('location_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Sync queued events to server
  private async syncQueuedEvents() {
    try {
      const queued = await this.getQueuedEvents();
      if (queued.length === 0) return;

      const successful: string[] = [];
      const failed: QueuedLocationEvent[] = [];

      for (const event of queued) {
        const success = await this.sendLocationEvent(event.data);
        if (success) {
          successful.push(event.id);
        } else {
          event.retryCount++;
          if (event.retryCount < 5) { // Max 5 retries
            failed.push(event);
          }
        }
      }

      // Update queue with only failed events
      await AsyncStorage.setItem('location_queue', JSON.stringify(failed));

      if (successful.length > 0) {
        console.log(`✅ Synced ${successful.length} queued location events`);
      }
    } catch (error) {
      console.error('Failed to sync queued events:', error);
    }
  }

  // Get current position (one-time)
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }

  // Get tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      userId: this.userId,
      hasWatchId: this.watchId !== null
    };
  }

  // Manual sync trigger
  async forceSyncQueuedEvents() {
    await this.syncQueuedEvents();
  }

  // Get queue status
  async getQueueStatus() {
    const queued = await this.getQueuedEvents();
    return {
      queuedCount: queued.length,
      oldestEvent: queued.length > 0 ? new Date(Math.min(...queued.map(e => e.timestamp))) : null
    };
  }

  // Clear all queued events (for debugging)
  async clearQueue() {
    await AsyncStorage.removeItem('location_queue');
    console.log('🗑️ Location event queue cleared');
  }
}

// Create singleton instance
export const locationService = new LocationService();