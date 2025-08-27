// Auto-generated types from Supabase
// Run `supabase gen types typescript --local` to regenerate this file

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'salesperson'
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'salesperson'
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'salesperson'
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      accounts: {
        Row: {
          id: string
          account_name: string
          address: string
          city: string
          state: string
          zip_code: string
          latitude: number
          longitude: number
          geofence_radius: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_name: string
          address: string
          city: string
          state: string
          zip_code: string
          latitude: number
          longitude: number
          geofence_radius?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_name?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          latitude?: number
          longitude?: number
          geofence_radius?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          assigned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          assigned_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          assigned_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'user_accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_accounts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          }
        ]
      }
      visits: {
        Row: {
          id: string
          user_id: string
          account_id: string
          check_in_time: string
          check_out_time: string | null
          duration_minutes: number | null
          check_in_location: Json
          check_out_location: Json | null
          visit_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          check_in_time: string
          check_out_time?: string | null
          duration_minutes?: number | null
          check_in_location: Json
          check_out_location?: Json | null
          visit_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          check_in_time?: string
          check_out_time?: string | null
          duration_minutes?: number | null
          check_in_location?: Json
          check_out_location?: Json | null
          visit_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'visits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visits_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          }
        ]
      }
      location_events: {
        Row: {
          id: string
          user_id: string
          timestamp: string
          latitude: number
          longitude: number
          accuracy: number
          event_type: 'significant_change' | 'high_accuracy' | 'background_sync'
          detected_accounts: string[]
          processed: boolean
          visit_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          timestamp: string
          latitude: number
          longitude: number
          accuracy: number
          event_type: 'significant_change' | 'high_accuracy' | 'background_sync'
          detected_accounts?: string[]
          processed?: boolean
          visit_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          timestamp?: string
          latitude?: number
          longitude?: number
          accuracy?: number
          event_type?: 'significant_change' | 'high_accuracy' | 'background_sync'
          detected_accounts?: string[]
          processed?: boolean
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'location_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'location_events_visit_id_fkey'
            columns: ['visit_id']
            isOneToOne: false
            referencedRelation: 'visits'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accounts_near_location: {
        Args: {
          lat: number
          lng: number
          radius_km: number
        }
        Returns: {
          id: string
          account_name: string
          address: string
          distance_km: number
          latitude: number
          longitude: number
          geofence_radius: number
        }[]
      }
      get_dashboard_stats: {
        Args: {}
        Returns: {
          total_users: number
          total_accounts: number
          total_visits_today: number
          total_visits_this_week: number
          active_users_now: number
          average_visit_duration: number
        }
      }
      get_visit_summary: {
        Args: {
          start_date?: string
          end_date?: string
        }
        Returns: {
          user_id: string
          user_name: string
          account_id: string
          account_name: string
          total_visits: number
          total_duration_minutes: number
          last_visit: string
          average_duration_minutes: number
        }[]
      }
      geocode_address: {
        Args: {
          address_text: string
        }
        Returns: {
          latitude: number
          longitude: number
          formatted_address: string
        }
      }
    }
    Enums: {
      user_role: 'admin' | 'salesperson'
      location_event_type: 'significant_change' | 'high_accuracy' | 'background_sync'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}