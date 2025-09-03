import React, { useState, useEffect } from 'react';
import { supabase } from '@salesperson-tracking/supabase';
import { adminFunctions } from '@salesperson-tracking/supabase';
import type { Profile } from '@salesperson-tracking/types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Detection settings editor state (pilot overrides)
  const [openSettingsUser, setOpenSettingsUser] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUsers(data || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setLoading(false);
    }
  };

  const loadUserSettings = async (userId: string) => {
    try {
      setSettingsError(null);
      setSettingsLoading(true);
      const { data, error } = await adminFunctions.getDetectionSettings(userId);
      if (error) throw error as any;
      setSettings({
        enabled: data?.enabled ?? true,
        min_dwell_minutes: data?.min_dwell_minutes ?? 10,
        gap_minutes: data?.gap_minutes ?? 60,
        buffer_meters: data?.buffer_meters ?? 50,
        min_radius_m: data?.min_radius_m ?? 50,
        max_radius_m: data?.max_radius_m ?? 500,
        max_duration_minutes: data?.max_duration_minutes ?? 480,
        speed_threshold_kmh: data?.speed_threshold_kmh ?? 45,
      });
    } catch (e: any) {
      setSettingsError(e?.message || 'Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveUserSettings = async (userId: string) => {
    try {
      setSettingsError(null);
      setSettingsLoading(true);
      const payload = { ...settings };
      const { error } = await adminFunctions.upsertDetectionSettings(userId, payload);
      if (error) throw error as any;
      setOpenSettingsUser(null);
    } catch (e: any) {
      setSettingsError(e?.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      // Create user using regular signup (since admin.createUser requires service role)
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'salesperson'
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // Create/update profile manually to ensure it has correct data
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone || null,
            role: 'salesperson'
          });

        if (profileError) {
          console.warn('Profile creation failed, but user was created:', profileError);
        }
      }

      // Reset form and reload users
      setFormData({ email: '', password: '', full_name: '', phone: '' });
      setShowCreateForm(false);
      await loadUsers();
      
      setFormLoading(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
      setFormLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div>Loading users...</div>
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
              User Management
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Create and manage salesperson accounts
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {showCreateForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>
      </div>

      {/* Create user form */}
      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Create New Salesperson
          </h2>

          {formError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={createUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password (min 6 chars)"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: formLoading ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: formLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {formLoading ? 'Creating...' : 'Create Salesperson'}
            </button>
          </form>
        </div>
      )}

      {/* Error display */}
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
          <p>Error: {error}</p>
          <button
            onClick={loadUsers}
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
            Retry
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
            All Users ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>No users found. Create your first salesperson above!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Email
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Role
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Phone
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} style={{ borderBottom: index < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>{user.full_name}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: user.role === 'admin' ? '#dbeafe' : '#d1fae5',
                        color: user.role === 'admin' ? '#1e40af' : '#065f46'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {user.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: user.is_active ? '#d1fae5' : '#fee2e2',
                        color: user.is_active ? '#065f46' : '#991b1b'
                      }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: user.is_active ? '#ef4444' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={async () => { const next = openSettingsUser === user.id ? null : user.id; setOpenSettingsUser(next); if (next) await loadUserSettings(user.id); }}
                            style={{
                              marginLeft: '0.5rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Settings
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {openSettingsUser === user.id && (
                    <tr>
                      <td colSpan={6} style={{ background: '#f9fafb' }}>
                        <div style={{ padding: '0.75rem 1rem' }}>
                          <h4 style={{ marginBottom: 8 }}>Detection Settings</h4>
                          {settingsError && <div style={{ color: '#991b1b', marginBottom: 8 }}>{settingsError}</div>}
                          {settingsLoading ? (
                            <div>Loading…</div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                              {[
                                { key: 'enabled', label: 'Enabled', type: 'checkbox' },
                                { key: 'min_dwell_minutes', label: 'Min Dwell (min)' },
                                { key: 'gap_minutes', label: 'Gap (min)' },
                                { key: 'buffer_meters', label: 'Buffer (m)' },
                                { key: 'min_radius_m', label: 'Min Radius (m)' },
                                { key: 'max_radius_m', label: 'Max Radius (m)' },
                                { key: 'max_duration_minutes', label: 'Max Duration (min)' },
                                { key: 'speed_threshold_kmh', label: 'Speed Threshold (km/h)' },
                              ].map((f) => (
                                <label key={String(f.key)} style={{ fontSize: 12, color: '#374151' }}>
                                  {f.label}
                                  {f.type === 'checkbox' ? (
                                    <input type="checkbox" checked={!!settings[f.key]} onChange={(e) => setSettings(prev => ({ ...prev, [f.key]: e.target.checked }))} style={{ marginLeft: 8 }} />
                                  ) : (
                                    <input type="number" value={settings[f.key] ?? ''} onChange={(e) => setSettings(prev => ({ ...prev, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))} style={{ marginLeft: 8, width: '100%' }} />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                          <div style={{ marginTop: 8 }}>
                            <button onClick={() => user.id && saveUserSettings(user.id)} disabled={settingsLoading} style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setOpenSettingsUser(null)} style={{ marginLeft: 8, padding: '0.25rem 0.5rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Close</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Back to dashboard */}
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
