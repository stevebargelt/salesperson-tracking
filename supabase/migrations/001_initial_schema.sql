-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'salesperson');
CREATE TYPE location_event_type AS ENUM ('significant_change', 'high_accuracy', 'background_sync');

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'salesperson',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geofence_radius INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_accounts junction table
CREATE TABLE IF NOT EXISTS user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, account_id)
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    check_in_location JSONB NOT NULL,
    check_out_location JSONB,
    visit_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create location_events table
CREATE TABLE IF NOT EXISTS location_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2) NOT NULL,
    event_type location_event_type NOT NULL,
    detected_accounts TEXT[] DEFAULT '{}',
    processed BOOLEAN NOT NULL DEFAULT false,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_location 
    ON accounts USING GIST(ST_Point(longitude, latitude));

CREATE INDEX IF NOT EXISTS idx_location_events_location 
    ON location_events USING GIST(ST_Point(longitude, latitude));

-- Add regular indexes
CREATE INDEX IF NOT EXISTS idx_location_events_user_timestamp 
    ON location_events(user_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_location_events_processed 
    ON location_events(processed) WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_visits_user_account 
    ON visits(user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_visits_created_at 
    ON visits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id 
    ON user_accounts(user_id) WHERE is_active = true;

-- Add function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to calculate visit duration
CREATE OR REPLACE FUNCTION calculate_visit_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_out_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for visit duration calculation
CREATE TRIGGER calculate_visit_duration_trigger
    BEFORE INSERT OR UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION calculate_visit_duration();