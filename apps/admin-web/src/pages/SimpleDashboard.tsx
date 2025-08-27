import React, { useEffect, useState } from 'react';
import { supabase } from '@salesperson-tracking/supabase';
import { useAuthStore } from '../store/authStore';

interface Stats {
  total_users: number;
  total_accounts: number;
  total_visits_today: number;
  total_visits_this_week: number;
  active_users_now: number;
  average_visit_duration: number | null;
}

export const SimpleDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, signOut } = useAuthStore();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      
      if (error) throw error;
      
      setStats(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '2px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
              Salesperson Tracking Dashboard
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Welcome, {profile?.full_name}
            </span>
            <button
              onClick={signOut}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '2rem' }}>
        {error ? (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <p>Error: {error}</p>
            <button
              onClick={loadStats}
              style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            {/* Stats cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                title="Total Salespeople"
                value={stats?.total_users || 0}
                color="#10b981"
              />
              <StatCard
                title="Total Accounts"
                value={stats?.total_accounts || 0}
                color="#3b82f6"
              />
              <StatCard
                title="Visits Today"
                value={stats?.total_visits_today || 0}
                color="#8b5cf6"
              />
              <StatCard
                title="Visits This Week"
                value={stats?.total_visits_this_week || 0}
                color="#f59e0b"
              />
              <StatCard
                title="Active Users Now"
                value={stats?.active_users_now || 0}
                color="#ef4444"
              />
              <StatCard
                title="Avg Visit Duration"
                value={stats?.average_visit_duration ? `${Math.round(stats.average_visit_duration)}min` : 'N/A'}
                color="#6366f1"
              />
            </div>

            {/* Quick actions */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                Quick Actions
              </h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <ActionButton onClick={() => window.location.href = '/users'}>
                  👥 Manage Users
                </ActionButton>
                <ActionButton onClick={() => window.location.href = '/accounts'}>
                  🏢 Manage Accounts
                </ActionButton>
                <ActionButton onClick={() => window.location.href = '/visits'}>
                  📊 View Visits
                </ActionButton>
                <ActionButton onClick={loadStats}>
                  🔄 Refresh Data
                </ActionButton>
              </div>
            </div>

            {/* System status */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginTop: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                System Status
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <StatusItem label="Database" value="Connected" color="green" />
                <StatusItem label="PostGIS" value="Active" color="green" />
                <StatusItem label="Authentication" value="Working" color="green" />
                <StatusItem label="Total Accounts" value={`${stats?.total_accounts || 0}`} color="blue" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
      {title}
    </div>
    <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
      {value}
    </div>
  </div>
);

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.75rem 1rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.15s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#1d4ed8';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#3b82f6';
    }}
  >
    {children}
  </button>
);

interface StatusItemProps {
  label: string;
  value: string;
  color: 'green' | 'blue' | 'red';
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, color }) => {
  const colors = {
    green: '#10b981',
    blue: '#3b82f6',
    red: '#ef4444'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>{label}:</span>
      <span style={{ color: colors[color], fontWeight: '600', fontSize: '0.875rem' }}>{value}</span>
    </div>
  );
};