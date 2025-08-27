import React, { useEffect, useState } from 'react';
import { supabase } from '@salesperson-tracking/supabase';
import { formatDateTime, formatDuration } from '@salesperson-tracking/utils';

interface VisitRecord {
  id: string;
  user_id: string;
  account_id: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  visit_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  accounts: {
    account_name: string;
    address: string;
    city: string;
    state: string;
  };
}

export const VisitsView: React.FC = () => {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          user_id,
          account_id,
          check_in_time,
          check_out_time,
          duration_minutes,
          visit_notes,
          created_at,
          profiles (
            full_name,
            email
          ),
          accounts (
            account_name,
            address,
            city,
            state
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setVisits(data || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visits');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        Loading visits...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
              Recent Visits
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              All detected salesperson visits
            </p>
          </div>
          <button
            onClick={loadVisits}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          Error: {error}
        </div>
      )}

      {/* Visits table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
            All Visits ({visits.length})
          </h2>
        </div>

        {visits.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>No visits found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Salesperson
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Account
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Check In
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Check Out
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Duration
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit, index) => (
                  <tr key={visit.id} style={{ borderBottom: index < visits.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {visit.profiles.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {visit.profiles.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {visit.accounts.account_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {visit.accounts.city}, {visit.accounts.state}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                      {formatDateTime(visit.check_in_time)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                      {visit.check_out_time ? formatDateTime(visit.check_out_time) : 'In progress'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {visit.duration_minutes ? (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {formatDuration(visit.duration_minutes)}
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          Calculating...
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {visit.accounts.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Back button */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};