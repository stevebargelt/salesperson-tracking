-- Initial data for Salesperson Tracking System
-- Run this after your migrations to set up sample data

-- Create an admin user (you'll need to sign up through Supabase first, then update this)
-- UPDATE: Replace 'your-admin-user-id' with the actual UUID from auth.users after signup
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-admin-user-id';

-- Sample accounts for testing
INSERT INTO accounts (account_name, address, city, state, zip_code, latitude, longitude, geofence_radius) VALUES
('Apple Store - Cupertino', '10600 N Tantau Ave', 'Cupertino', 'CA', '95014', 37.3230, -122.0322, 150),
('Google - Mountain View', '1600 Amphitheatre Parkway', 'Mountain View', 'CA', '94043', 37.4220, -122.0841, 200),
('Meta - Menlo Park', '1 Hacker Way', 'Menlo Park', 'CA', '94025', 37.4843, -122.1477, 180),
('Tesla - Palo Alto', '3500 Deer Creek Road', 'Palo Alto', 'CA', '94304', 37.3957, -122.1508, 120),
('Stanford Shopping Center', '660 Stanford Shopping Center', 'Palo Alto', 'CA', '94304', 37.4419, -122.1719, 250),
('Salesforce Tower', '415 Mission St', 'San Francisco', 'CA', '94105', 37.7899, -122.3972, 100),
('Oracle Park', '24 Willie Mays Plaza', 'San Francisco', 'CA', '94107', 37.7786, -122.3893, 300),
('Ghirardelli Square', '900 North Point St', 'San Francisco', 'CA', '94109', 37.8056, -122.4225, 150),
('Pier 39', 'Beach St & The Embarcadero', 'San Francisco', 'CA', '94133', 37.8087, -122.4098, 200),
('Golden Gate Park', '501 Stanyan St', 'San Francisco', 'CA', '94117', 37.7694, -122.4862, 500);

-- Function to assign random accounts to a user (useful for testing)
CREATE OR REPLACE FUNCTION assign_random_accounts_to_user(
    target_user_id UUID,
    num_accounts INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
    account_record RECORD;
    assigned_count INTEGER := 0;
BEGIN
    -- Randomly select accounts and assign them to the user
    FOR account_record IN 
        SELECT id FROM accounts 
        WHERE is_active = true 
        ORDER BY RANDOM() 
        LIMIT num_accounts
    LOOP
        INSERT INTO user_accounts (user_id, account_id)
        VALUES (target_user_id, account_record.id)
        ON CONFLICT (user_id, account_id) DO NOTHING;
        
        assigned_count := assigned_count + 1;
    END LOOP;
    
    RETURN assigned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate sample location events (for testing)
CREATE OR REPLACE FUNCTION generate_sample_location_events(
    target_user_id UUID,
    days_back INTEGER DEFAULT 7,
    events_per_day INTEGER DEFAULT 10
)
RETURNS INTEGER AS $$
DECLARE
    account_record RECORD;
    day_offset INTEGER;
    event_count INTEGER;
    base_time TIMESTAMPTZ;
    event_lat DECIMAL;
    event_lng DECIMAL;
    event_accuracy DECIMAL;
    total_events INTEGER := 0;
BEGIN
    -- Get user's assigned accounts
    FOR account_record IN 
        SELECT a.id, a.latitude, a.longitude, a.geofence_radius
        FROM accounts a
        INNER JOIN user_accounts ua ON ua.account_id = a.id
        WHERE ua.user_id = target_user_id AND ua.is_active = true
        LIMIT 3  -- Limit to 3 accounts for sample data
    LOOP
        -- Generate events for each day
        FOR day_offset IN 0..days_back-1 LOOP
            base_time := CURRENT_DATE - INTERVAL '1 day' * day_offset + INTERVAL '9 hours';
            
            -- Generate events around this account
            FOR event_count IN 1..LEAST(events_per_day, 15) LOOP
                -- Add some random variation to location (within 500m)
                event_lat := account_record.latitude + (RANDOM() - 0.5) * 0.005;
                event_lng := account_record.longitude + (RANDOM() - 0.5) * 0.005;
                event_accuracy := 50 + RANDOM() * 100; -- 50-150m accuracy
                
                INSERT INTO location_events (
                    user_id,
                    timestamp,
                    latitude,
                    longitude,
                    accuracy,
                    event_type,
                    detected_accounts
                ) VALUES (
                    target_user_id,
                    base_time + INTERVAL '1 hour' * event_count + INTERVAL '1 minute' * (RANDOM() * 30),
                    event_lat,
                    event_lng,
                    event_accuracy,
                    'significant_change',
                    ARRAY[account_record.id::TEXT]
                );
                
                total_events := total_events + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN total_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample usage instructions (commented out):
-- After creating a test user through Supabase Auth:
-- 1. Get the user UUID from auth.users
-- 2. Assign random accounts: SELECT assign_random_accounts_to_user('user-uuid-here', 5);
-- 3. Generate sample events: SELECT generate_sample_location_events('user-uuid-here', 7, 12);
-- 4. Process events into visits: SELECT process_location_events_for_visits();

-- Create a test admin function (only run in development)
CREATE OR REPLACE FUNCTION setup_test_environment()
RETURNS TEXT AS $$
BEGIN
    -- This function should only be used in development/testing
    IF current_setting('app.environment', true) = 'production' THEN
        RETURN 'ERROR: This function cannot be run in production';
    END IF;
    
    -- Add any other test setup here
    RETURN 'Test environment setup complete. Remember to:\n' ||
           '1. Sign up admin user through Supabase Auth\n' ||
           '2. Update their profile role to admin\n' ||
           '3. Create salesperson users\n' ||
           '4. Run assign_random_accounts_to_user() for each salesperson\n' ||
           '5. Optionally run generate_sample_location_events() for testing';
END;
$$ LANGUAGE plpgsql;