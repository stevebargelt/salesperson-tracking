import type { LocationPoint, ValidationError, FormValidationResult } from '@salesperson-tracking/types';

// Distance calculation using Haversine formula
export function calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if a point is within a circular geofence
export function isInsideGeofence(
  point: LocationPoint, 
  center: LocationPoint, 
  radiusMeters: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

// Format date/time for display
export function formatDateTime(dateString: string, includeTime: boolean = true): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
}

// Get time ago string
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}min ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return formatDateTime(dateString, false);
  }
}

// Generate a unique ID (simple version - you might want to use a proper UUID library)
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Form validation utilities
export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) {
    return { field: 'email', message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Invalid email format' };
  }
  return null;
}

export function validateRequired(value: string, fieldName: string): ValidationError | null {
  if (!value || !value.trim()) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validatePhone(phone: string): ValidationError | null {
  if (!phone.trim()) return null; // Phone is optional
  
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return { field: 'phone', message: 'Invalid phone number format' };
  }
  return null;
}

export function validateCoordinates(lat: number, lng: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (lat < -90 || lat > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
  }
  
  if (lng < -180 || lng > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
  }
  
  return errors;
}

// Array utilities
export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = key(item);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function sortBy<T>(array: T[], key: (item: T) => any, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = key(a);
    const bVal = key(b);
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Local storage utilities (for web)
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

// Async utilities
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

// Color utilities for the dashboard
export function getStatusColor(status: 'active' | 'inactive' | 'warning'): string {
  switch (status) {
    case 'active': return '#10B981'; // Green
    case 'inactive': return '#6B7280'; // Gray
    case 'warning': return '#F59E0B'; // Amber
    default: return '#6B7280';
  }
}

// Business hours utilities
export function isBusinessHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Monday to Friday, 9 AM to 5 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

export function getBusinessHoursLabel(date: Date = new Date()): string {
  return isBusinessHours(date) ? 'Business Hours' : 'After Hours';
}