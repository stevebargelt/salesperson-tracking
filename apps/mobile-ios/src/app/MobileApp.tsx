import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { supabase } from '@salesperson-tracking/supabase';
import { locationService } from '../services/LocationService';
import type { Profile, Account, Visit } from '@salesperson-tracking/types';
import { formatDateTime, formatDuration } from '@salesperson-tracking/utils';

export const MobileApp: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState({ queuedCount: 0, oldestEvent: null });

  // Login state
  const [email, setEmail] = useState('steve@harebrained-apps.com');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    updateQueueStatus();
    
    // Update queue status every 30 seconds
    const interval = setInterval(updateQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await loadUserData(user.id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profile);

      // Get assigned accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('user_accounts')
        .select(`
          accounts (
            id,
            account_name,
            address,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            geofence_radius
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (accountsError) throw accountsError;
      
      const userAccounts = accountsData?.map(ua => ua.accounts).filter(Boolean) || [];
      setAccounts(userAccounts);

      // Get recent visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          id,
          check_in_time,
          check_out_time,
          duration_minutes,
          accounts (
            account_name,
            address,
            city,
            state
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (visitsError) throw visitsError;
      setRecentVisits(visitsData || []);

    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const updateQueueStatus = async () => {
    try {
      const status = await locationService.getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to get queue status:', error);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await loadUserData(data.user.id);
      }
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'Authentication failed');
    }
    setLoginLoading(false);
  };

  const handleSignOut = async () => {
    await locationService.stopTracking();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsTracking(false);
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        locationService.stopTracking();
        setIsTracking(false);
      } else {
        const success = await locationService.startTracking();
        if (success) {
          setIsTracking(true);
          Alert.alert('Tracking Started', 'Location tracking is now active. The app will detect when you visit assigned accounts.');
        } else {
          Alert.alert('Tracking Failed', 'Unable to start location tracking. Please check permissions.');
        }
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      Alert.alert(
        'Current Location',
        `Lat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}\nAccuracy: ${position.coords.accuracy?.toFixed(0)}m`
      );
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get current location');
    }
  };

  const forceSync = async () => {
    try {
      await locationService.forceSyncQueuedEvents();
      await updateQueueStatus();
      Alert.alert('Sync Complete', 'All queued location events have been synced');
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync queued events');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginContainer}>
          <Text style={styles.title}>Salesperson Tracker</Text>
          <Text style={styles.subtitle}>Sign in to start location tracking</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                onChangeText={setEmail}
                value={email}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={setPassword}
                value={password}
                placeholder="Password"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton, loginLoading && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={loginLoading}
            >
              <Text style={styles.buttonText}>
                {loginLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome, {profile.full_name}</Text>
            <Text style={styles.subtitle}>Salesperson Tracker</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Tracking Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Tracking</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tracking Active</Text>
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={isTracking ? '#059669' : '#6b7280'}
            />
          </View>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { color: isTracking ? '#10b981' : '#ef4444' }]}>
                {isTracking ? 'Active' : 'Stopped'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Queued Events</Text>
              <Text style={styles.statusValue}>{queueStatus.queuedCount}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={getCurrentLocation}>
              <Text style={styles.buttonText}>📍 Get Location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={forceSync}>
              <Text style={styles.buttonText}>🔄 Force Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Assigned Accounts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Accounts ({accounts.length})</Text>
          {accounts.length === 0 ? (
            <Text style={styles.emptyText}>No accounts assigned. Contact your administrator.</Text>
          ) : (
            accounts.slice(0, 5).map(account => (
              <View key={account.id} style={styles.accountItem}>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.account_name}</Text>
                  <Text style={styles.accountAddress}>
                    {account.address}, {account.city}, {account.state}
                  </Text>
                </View>
                <View style={styles.geofenceBadge}>
                  <Text style={styles.geofenceText}>{account.geofence_radius}m</Text>
                </View>
              </View>
            ))
          )}
          {accounts.length > 5 && (
            <Text style={styles.moreText}>...and {accounts.length - 5} more accounts</Text>
          )}
        </View>

        {/* Recent Visits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Visits ({recentVisits.length})</Text>
          {recentVisits.length === 0 ? (
            <Text style={styles.emptyText}>No visits detected yet. Start location tracking to begin detecting visits.</Text>
          ) : (
            recentVisits.slice(0, 5).map(visit => (
              <View key={visit.id} style={styles.visitItem}>
                <View style={styles.visitInfo}>
                  <Text style={styles.visitAccount}>{visit.accounts?.account_name}</Text>
                  <Text style={styles.visitTime}>{formatDateTime(visit.check_in_time)}</Text>
                  {visit.duration_minutes && (
                    <Text style={styles.visitDuration}>Duration: {formatDuration(visit.duration_minutes)}</Text>
                  )}
                </View>
                <View style={styles.visitStatus}>
                  <Text style={styles.visitStatusText}>
                    {visit.check_out_time ? '✅' : '🕐'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  signOutButton: {
    padding: 8,
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  signOutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    marginTop: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  accountAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  geofenceBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  geofenceText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  visitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  visitInfo: {
    flex: 1,
  },
  visitAccount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  visitTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  visitDuration: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  visitStatus: {
    padding: 8,
  },
  visitStatusText: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    padding: 20,
  },
  moreText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});