import React, { useEffect, useState } from 'react';
import { Users, Building2, MapPin, Clock, Activity, TrendingUp } from 'lucide-react';
import { supabaseHelpers, supabase } from '@salesperson-tracking/supabase';
import { formatDuration } from '@salesperson-tracking/utils';
import type { DashboardStats, UserLocationStatus } from '@salesperson-tracking/types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userStatus, setUserStatus] = useState<UserLocationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Load dashboard stats
      const { data: statsData, error: statsError } = await supabaseHelpers.getDashboardStats();
      if (statsError) throw statsError;
      
      // Load user location status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_user_location_status');
      if (statusError) throw statusError;

      setStats(statsData);
      setUserStatus(statusData || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">Error: {error}</p>
        <button 
          onClick={loadDashboardData}
          className="mt-2 text-sm text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Salespeople',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Accounts', 
      value: stats?.total_accounts || 0,
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      name: 'Visits Today',
      value: stats?.total_visits_today || 0,
      icon: MapPin,
      color: 'bg-purple-500',
    },
    {
      name: 'Active Users',
      value: stats?.active_users_now || 0,
      icon: Activity,
      color: 'bg-orange-500',
    },
    {
      name: 'Visits This Week',
      value: stats?.total_visits_this_week || 0,
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
    {
      name: 'Avg Visit Duration',
      value: stats?.average_visit_duration ? formatDuration(stats.average_visit_duration) : 'N/A',
      icon: Clock,
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your salesperson tracking system
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-md ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User status table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Salesperson Status
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Current location and activity status
          </p>
        </div>
        
        {userStatus.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No salespeople yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create salesperson accounts to see their tracking status here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {userStatus.map((user) => (
              <li key={user.user_id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${
                        user.minutes_since_last_update && user.minutes_since_last_update < 60
                          ? 'bg-green-400' 
                          : user.minutes_since_last_update && user.minutes_since_last_update < 240
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {user.user_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.minutes_since_last_update 
                          ? `Last seen ${user.minutes_since_last_update}m ago`
                          : 'Never seen'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {user.is_at_account && user.current_account && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-700">
                          At {user.current_account.account_name}
                        </p>
                        <p className="text-xs text-green-600">
                          Currently visiting
                        </p>
                      </div>
                    )}
                    
                    {user.current_location && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {user.current_location.latitude.toFixed(4)}, {user.current_location.longitude.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            System Status
          </h3>
        </div>
        
        <div className="px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Database:</span>
              <span className="ml-2 text-green-600 font-medium">Connected</span>
            </div>
            <div>
              <span className="text-gray-500">PostGIS:</span>
              <span className="ml-2 text-green-600 font-medium">Active</span>
            </div>
            <div>
              <span className="text-gray-500">Total Accounts:</span>
              <span className="ml-2 font-medium">{stats?.total_accounts || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Unprocessed Events:</span>
              <span className="ml-2 font-medium">{(stats as any)?.unprocessed_events || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};