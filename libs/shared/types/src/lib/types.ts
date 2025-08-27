// Core database types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'salesperson';
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  account_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string;
  user_id: string;
  account_id: string;
  assigned_at: string;
  is_active: boolean;
}

export interface Visit {
  id: string;
  user_id: string;
  account_id: string;
  check_in_time: string;
  check_out_time?: string;
  duration_minutes?: number;
  check_in_location: LocationPoint;
  check_out_location?: LocationPoint;
  visit_notes?: string;
  created_at: string;
  // Populated joins
  account?: Account;
  user?: Profile;
}

export type LocationEventType = 'significant_change' | 'high_accuracy' | 'background_sync';

export interface LocationEvent {
  id: string;
  user_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  event_type: LocationEventType;
  detected_accounts: string[]; // Array of account IDs
  processed: boolean;
  visit_id?: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

// API types
export interface CreateProfileRequest {
  email: string;
  full_name: string;
  role: 'admin' | 'salesperson';
  phone?: string;
}

export interface CreateAccountRequest {
  account_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  geofence_radius?: number;
}

export interface AssignAccountRequest {
  user_id: string;
  account_id: string;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  event_type: LocationEventType;
  timestamp: string;
}

// Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Analytics types
export interface VisitSummary {
  user_id: string;
  user_name: string;
  account_id: string;
  account_name: string;
  total_visits: number;
  total_duration_minutes: number;
  last_visit: string;
  average_duration_minutes: number;
}

export interface DashboardStats {
  total_users: number;
  total_accounts: number;
  total_visits_today: number;
  total_visits_this_week: number;
  active_users_now: number;
  average_visit_duration: number;
}

export interface UserLocationStatus {
  user_id: string;
  user_name: string;
  last_seen: string;
  current_location?: LocationPoint;
  is_at_account: boolean;
  current_account?: Account;
  battery_level?: number;
}

// Mobile app types
export interface SLCConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter: number;
}

export interface AppSettings {
  user_id: string;
  tracking_enabled: boolean;
  slc_config: SLCConfig;
  last_sync: string;
  battery_optimization_enabled: boolean;
}

// Geolocation types (React Native compatible)
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Visit detection types
export interface VisitDetectionRule {
  minimumDwellTime: number; // minutes
  proximityRadius: number; // meters
  businessHoursOnly: boolean;
  multipleEventsRequired: boolean;
}

export interface VisitCorrelationResult {
  account_id: string;
  account_name: string;
  distance_meters: number;
  confidence: number;
  entry_time: string;
  exit_time?: string;
  duration_minutes?: number;
  location_events: LocationEvent[];
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Filter and sort types
export interface DateRange {
  start: string;
  end: string;
}

export interface VisitFilters {
  user_id?: string;
  account_id?: string;
  date_range?: DateRange;
  min_duration?: number;
  max_duration?: number;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Export convenience type for the main entities
export type DatabaseEntity = Profile | Account | UserAccount | Visit | LocationEvent;