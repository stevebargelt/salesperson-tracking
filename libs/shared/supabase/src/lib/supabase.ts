import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables - these should be set in your environment or .env files
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key are required. Please set environment variables.');
}

// Create the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper functions for common operations
export const supabaseHelpers = {
  // Auth helpers
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string, metadata?: object) {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: metadata,
      },
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    return await supabase.auth.getUser();
  },

  async getCurrentSession() {
    return await supabase.auth.getSession();
  },

  // Profile helpers
  async getProfile(userId: string) {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  },

  async updateProfile(userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
  },

  // Account helpers
  async getUserAccounts(userId: string) {
    return await supabase
      .from('user_accounts')
      .select(`
        id,
        assigned_at,
        is_active,
        accounts (
          id,
          account_name,
          address,
          city,
          state,
          zip_code,
          latitude,
          longitude,
          geofence_radius,
          is_active
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);
  },

  async getAccountsNearLocation(latitude: number, longitude: number, radiusKm: number = 1) {
    return await supabase.rpc('accounts_near_location', {
      lat: latitude,
      lng: longitude,
      radius_km: radiusKm,
    });
  },

  // Visit helpers
  async createVisit(visit: Database['public']['Tables']['visits']['Insert']) {
    return await supabase
      .from('visits')
      .insert(visit)
      .select()
      .single();
  },

  async updateVisit(visitId: string, updates: Database['public']['Tables']['visits']['Update']) {
    return await supabase
      .from('visits')
      .update(updates)
      .eq('id', visitId)
      .select()
      .single();
  },

  async getUserVisits(userId: string, limit: number = 50) {
    return await supabase
      .from('visits')
      .select(`
        id,
        check_in_time,
        check_out_time,
        duration_minutes,
        check_in_location,
        check_out_location,
        visit_notes,
        created_at,
        accounts (
          id,
          account_name,
          address,
          city,
          state
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Location event helpers
  async recordLocationEvent(event: Database['public']['Tables']['location_events']['Insert']) {
    return await supabase
      .from('location_events')
      .insert(event);
  },

  async getUnprocessedLocationEvents(userId: string) {
    return await supabase
      .from('location_events')
      .select('*')
      .eq('user_id', userId)
      .eq('processed', false)
      .order('timestamp', { ascending: true });
  },

  async markLocationEventsProcessed(eventIds: string[]) {
    return await supabase
      .from('location_events')
      .update({ processed: true })
      .in('id', eventIds);
  },

  // Real-time subscriptions
  subscribeToUserVisits(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`visits:user_id=eq.${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visits',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  },

  subscribeToAccountUpdates(callback: (payload: any) => void) {
    return supabase
      .channel('accounts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'accounts',
      }, callback)
      .subscribe();
  },

  // Admin helpers
  async getAllUsers() {
    return await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async getAllAccounts() {
    return await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async getDashboardStats() {
    return await supabase.rpc('get_dashboard_stats');
  },

  async getVisitSummary(dateRange?: { start: string; end: string }) {
    return await supabase.rpc('get_visit_summary', {
      start_date: dateRange?.start,
      end_date: dateRange?.end,
    });
  },

  // Geocoding helper (if we add a geocoding function)
  async geocodeAddress(address: string) {
    return await supabase.rpc('geocode_address', { address_text: address });
  },
};

// Export types for better TypeScript support
export type SupabaseClient = typeof supabase;
export type DatabaseTypes = Database;
export { Database };