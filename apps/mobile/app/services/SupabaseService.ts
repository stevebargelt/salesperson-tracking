import { createClient } from '@supabase/supabase-js';

// React Native environment - these should come from environment variables in production
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Create the Supabase client for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // React Native doesn't need URL detection
  },
});

// Helper functions for mobile app
export const supabaseHelpers = {
  // Auth helpers
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    return await supabase.auth.getUser();
  },

  // Get user accounts with account details
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
};