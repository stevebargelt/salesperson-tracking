import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from Expo config
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Verify Supabase configuration on startup
if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL_HERE')) {
  console.error('❌ Supabase URL not configured properly');
}
if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')) {
  console.error('❌ Supabase API key not configured properly');
}

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
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        console.error('🔐 Login failed:', result.error.message);
      } else {
        console.log('🔐 Login successful for:', email);
      }
      
      return result;
    } catch (error) {
      console.error('🔐 Login exception:', error);
      throw error;
    }
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