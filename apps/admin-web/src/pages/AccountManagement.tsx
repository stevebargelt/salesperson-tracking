import React, { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '@salesperson-tracking/supabase';
import type { Account, Profile } from '@salesperson-tracking/types';
import { formatDistance } from '@salesperson-tracking/utils';

interface AccountWithAssignments extends Account {
  assigned_users?: Profile[];
  user_count?: number;
}

export const AccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountWithAssignments[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    account_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    geofence_radius: 100
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    id: '',
    account_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    geofence_radius: 100,
  });
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      
      // Load accounts with assignment counts (LEFT JOIN to include unassigned accounts)
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          *,
          user_accounts (
            user_id,
            is_active,
            profiles (
              full_name,
              email,
              role
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Load all salespeople
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'salesperson')
        .eq('is_active', true)
        .order('full_name');

      if (usersError) throw usersError;

      // Process accounts data
      const processedAccounts = (accountsData || []).map(account => ({
        ...account,
        user_count: account.user_accounts?.filter(ua => ua.is_active).length || 0,
        assigned_users: account.user_accounts
          ?.filter(ua => ua.is_active && ua.profiles)
          ?.map(ua => ua.profiles)
          ?.filter(Boolean) || []
      }));

      setAccounts(processedAccounts);
      setUsers(usersData || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      // Geocode the address
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;

      // Try Supabase RPC first (if present), then fallback to client-side Nominatim
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const { data: geo } = await supabaseHelpers.geocodeAddress(fullAddress);
        if (geo && typeof (geo as any).latitude === 'number' && typeof (geo as any).longitude === 'number') {
          latitude = (geo as any).latitude;
          longitude = (geo as any).longitude;
        }
      } catch (rpcErr) {
        // Ignore; we'll try client-side fallback
      }

      if (latitude == null || longitude == null) {
        // Fallback: OpenStreetMap Nominatim (client-side). For production, consider a paid provider.
        const q = encodeURIComponent(fullAddress);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
        const res = await fetch(url, {
          headers: {
            // Cannot set User-Agent from browser; optionally include your email in params if needed.
            'Accept': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('Failed to geocode address. Please verify the address and try again.');
        }
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length > 0) {
          latitude = parseFloat(arr[0].lat);
          longitude = parseFloat(arr[0].lon);
        }
      }

      if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('Failed to geocode address. Please verify the address and try again.');
      }

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          account_name: formData.account_name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          latitude,
          longitude,
          geofence_radius: formData.geofence_radius
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and reload
      setFormData({
        account_name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        geofence_radius: 100
      });
      setShowCreateForm(false);
      await loadData();
      
      setFormLoading(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create account');
      setFormLoading(false);
    }
  };

  const assignAccountToUser = async (accountId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .insert({ user_id: userId, account_id: accountId });

      if (error) throw error;
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign account');
    }
  };

  const removeAccountAssignment = async (accountId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId);

      if (error) throw error;
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  const beginEditAccount = (account: AccountWithAssignments) => {
    setEditFormError(null);
    setEditFormData({
      id: account.id,
      account_name: account.account_name,
      address: account.address,
      city: account.city,
      state: account.state,
      zip_code: account.zip_code,
      geofence_radius: account.geofence_radius,
    });
    setShowEditForm(true);
    setShowCreateForm(false);
  };

  const updateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormError(null);

    try {
      const fullAddress = `${editFormData.address}, ${editFormData.city}, ${editFormData.state} ${editFormData.zip_code}`;

      // Try RPC geocoding first
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const { data: geo } = await supabaseHelpers.geocodeAddress(fullAddress);
        if (geo && typeof (geo as any).latitude === 'number' && typeof (geo as any).longitude === 'number') {
          latitude = (geo as any).latitude;
          longitude = (geo as any).longitude;
        }
      } catch {}

      // Fallback to Nominatim if needed
      if (latitude == null || longitude == null) {
        const q = encodeURIComponent(fullAddress);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length > 0) {
            latitude = parseFloat(arr[0].lat);
            longitude = parseFloat(arr[0].lon);
          }
        }
      }

      if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('Failed to geocode address. Please verify the address and try again.');
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          account_name: editFormData.account_name,
          address: editFormData.address,
          city: editFormData.city,
          state: editFormData.state,
          zip_code: editFormData.zip_code,
          latitude,
          longitude,
        })
        .eq('id', editFormData.id);

      if (updateError) throw updateError;

      setShowEditForm(false);
      await loadData();
    } catch (err) {
      setEditFormError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setEditFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        Loading accounts...
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
              Account Management
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Manage customer accounts and assignments
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
            {showCreateForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>
      </div>

      {/* Create account form */}
      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Add New Account
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

          <form onSubmit={createAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="Customer Company Name"
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
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St"
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
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Seattle"
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
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="WA"
                  required
                  maxLength={2}
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
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="98101"
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
                  Geofence Radius (meters)
                </label>
                <input
                  type="number"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData(prev => ({ ...prev, geofence_radius: parseInt(e.target.value) || 100 }))}
                  min="50"
                  max="1000"
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
              {formLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Edit account form */}
      {showEditForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Edit Account
          </h2>

          {editFormError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {editFormError}
            </div>
          )}

          <form onSubmit={updateAccount}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Account Name *
                </label>
                <input
                  type="text"
                  value={editFormData.account_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="Customer Company Name"
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
                  Address *
                </label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St"
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
                  City *
                </label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Seattle"
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
                  State *
                </label>
                <input
                  type="text"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="WA"
                  required
                  maxLength={2}
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
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={editFormData.zip_code}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="98101"
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
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={editFormLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: editFormLoading ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: editFormLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {editFormLoading ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
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
            onClick={loadData}
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

      {/* Accounts table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
            All Accounts ({accounts.length})
          </h2>
        </div>

        {accounts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>No accounts found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Account Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Location
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Geofence
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Assigned To
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={account.id} style={{ borderBottom: index < accounts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {account.account_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {account.address}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {account.city}, {account.state} {account.zip_code}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDistance(account.geofence_radius)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {account.assigned_users && account.assigned_users.length > 0 ? (
                        <div style={{ fontSize: '0.75rem' }}>
                          {account.assigned_users.map((user, i) => (
                            <div key={user.id} style={{ 
                              display: 'inline-block',
                              margin: '0.125rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '0.25rem'
                            }}>
                              {user.full_name}
                              <button
                                onClick={() => removeAccountAssignment(account.id, user.id)}
                                style={{
                                  marginLeft: '0.25rem',
                                  background: 'none',
                                  border: 'none',
                                  color: '#1e40af',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => beginEditAccount(account)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>

                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignAccountToUser(account.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="">Assign to...</option>
                          {users.filter(user => 
                            !account.assigned_users?.some(au => au.id === user.id)
                          ).map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
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
