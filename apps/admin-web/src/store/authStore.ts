import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, supabaseHelpers } from '@salesperson-tracking/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@salesperson-tracking/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null, 
      profile: null,
      loading: false,
      error: null,

      // Actions
      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null });
        
        try {
          const { data, error } = await supabaseHelpers.signIn(email, password);
          
          if (error) {
            set({ error: error.message, loading: false });
            return false;
          }

          if (data.user) {
            // Get user profile
            const { data: profile, error: profileError } = await supabaseHelpers.getProfile(data.user.id);
            
            if (profileError || !profile) {
              set({ error: 'Failed to load user profile', loading: false });
              return false;
            }

            // Check if user is admin
            if (profile.role !== 'admin') {
              await supabaseHelpers.signOut();
              set({ error: 'Access denied. Admin access required.', loading: false });
              return false;
            }

            set({
              user: data.user,
              session: data.session,
              profile,
              loading: false,
              error: null,
            });

            return true;
          }

          set({ error: 'Authentication failed', loading: false });
          return false;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'An error occurred', 
            loading: false 
          });
          return false;
        }
      },

      signOut: async () => {
        set({ loading: true });
        
        try {
          await supabaseHelpers.signOut();
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Sign out failed',
            loading: false 
          });
        }
      },

      initialize: async () => {
        set({ loading: true });

        try {
          const { data: { session } } = await supabaseHelpers.getCurrentSession();
          
          if (session?.user) {
            const { data: profile } = await supabaseHelpers.getProfile(session.user.id);
            
            if (profile && profile.role === 'admin') {
              set({
                user: session.user,
                session,
                profile,
                loading: false,
                error: null,
              });
            } else {
              // Not an admin, sign them out
              await supabaseHelpers.signOut();
              set({
                user: null,
                session: null,
                profile: null,
                loading: false,
                error: null,
              });
            }
          } else {
            set({
              user: null,
              session: null,
              profile: null,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Initialization failed',
          });
        }
      },

      checkSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentState = get();
        
        if (session && !currentState.session) {
          // Session exists but not in store, initialize
          await get().initialize();
        } else if (!session && currentState.session) {
          // Session expired, clear store
          set({
            user: null,
            session: null,
            profile: null,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        // Only persist user and session, not loading/error states
        user: state.user,
        session: state.session,
        profile: state.profile,
      }),
    }
  )
);

// Initialize auth on app startup
useAuthStore.getState().initialize();