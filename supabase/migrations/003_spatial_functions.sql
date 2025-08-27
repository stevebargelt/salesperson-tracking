-- Function to find accounts near a location
CREATE OR REPLACE FUNCTION accounts_near_location(
    lat DECIMAL,
    lng DECIMAL,
    radius_km DECIMAL DEFAULT 1.0
)
RETURNS TABLE (
    id UUID,
    account_name TEXT,
    address TEXT,
    distance_km DECIMAL,
    latitude DECIMAL,
    longitude DECIMAL,
    geofence_radius INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.account_name,
        a.address,
        ROUND(
            ST_Distance(
                ST_Point(lng, lat)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) / 1000.0,
            3
        ) AS distance_km,
        a.latitude,
        a.longitude,
        a.geofence_radius
    FROM accounts a
    WHERE a.is_active = true
      AND ST_DWithin(
          ST_Point(lng, lat)::geography,
          ST_Point(a.longitude, a.latitude)::geography,
          radius_km * 1000
      )
    ORDER BY ST_Distance(
        ST_Point(lng, lat)::geography,
        ST_Point(a.longitude, a.latitude)::geography
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's assigned accounts near a location
CREATE OR REPLACE FUNCTION user_accounts_near_location(
    user_id UUID,
    lat DECIMAL,
    lng DECIMAL,
    radius_km DECIMAL DEFAULT 1.0
)
RETURNS TABLE (
    id UUID,
    account_name TEXT,
    address TEXT,
    distance_km DECIMAL,
    latitude DECIMAL,
    longitude DECIMAL,
    geofence_radius INTEGER,
    is_inside_geofence BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.account_name,
        a.address,
        ROUND(
            ST_Distance(
                ST_Point(lng, lat)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) / 1000.0,
            3
        ) AS distance_km,
        a.latitude,
        a.longitude,
        a.geofence_radius,
        ST_Distance(
            ST_Point(lng, lat)::geography,
            ST_Point(a.longitude, a.latitude)::geography
        ) <= a.geofence_radius AS is_inside_geofence
    FROM accounts a
    INNER JOIN user_accounts ua ON ua.account_id = a.id
    WHERE ua.user_id = user_accounts_near_location.user_id
      AND ua.is_active = true
      AND a.is_active = true
      AND ST_DWithin(
          ST_Point(lng, lat)::geography,
          ST_Point(a.longitude, a.latitude)::geography,
          radius_km * 1000
      )
    ORDER BY ST_Distance(
        ST_Point(lng, lat)::geography,
        ST_Point(a.longitude, a.latitude)::geography
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect potential visits from location events
CREATE OR REPLACE FUNCTION detect_visits_from_location_events(
    target_user_id UUID,
    time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    account_id UUID,
    account_name TEXT,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    confidence DECIMAL,
    event_count INTEGER,
    avg_accuracy DECIMAL,
    location_events_ids UUID[]
) AS $$
DECLARE
    min_dwell_minutes INTEGER := 10;
    max_proximity_meters INTEGER := 1000;
BEGIN
    RETURN QUERY
    WITH location_events_with_accounts AS (
        SELECT 
            le.id as event_id,
            le.user_id,
            le.timestamp,
            le.latitude,
            le.longitude,
            le.accuracy,
            a.id as account_id,
            a.account_name,
            a.geofence_radius,
            ST_Distance(
                ST_Point(le.longitude, le.latitude)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) as distance_meters
        FROM location_events le
        INNER JOIN user_accounts ua ON ua.user_id = le.user_id
        INNER JOIN accounts a ON a.id = ua.account_id
        WHERE le.user_id = target_user_id
          AND le.timestamp >= NOW() - INTERVAL '1 hour' * time_window_hours
          AND ua.is_active = true
          AND a.is_active = true
          AND ST_DWithin(
              ST_Point(le.longitude, le.latitude)::geography,
              ST_Point(a.longitude, a.latitude)::geography,
              max_proximity_meters
          )
    ),
    visit_candidates AS (
        SELECT 
            lea.account_id,
            lea.account_name,
            MIN(lea.timestamp) as entry_time,
            MAX(lea.timestamp) as exit_time,
            COUNT(*) as event_count,
            AVG(lea.accuracy) as avg_accuracy,
            AVG(lea.distance_meters) as avg_distance,
            ARRAY_AGG(lea.event_id ORDER BY lea.timestamp) as event_ids
        FROM location_events_with_accounts lea
        GROUP BY lea.account_id, lea.account_name
        HAVING COUNT(*) >= 2  -- At least 2 location events
           AND EXTRACT(EPOCH FROM (MAX(lea.timestamp) - MIN(lea.timestamp))) / 60 >= min_dwell_minutes
    )
    SELECT 
        vc.account_id,
        vc.account_name,
        vc.entry_time,
        vc.exit_time,
        ROUND(EXTRACT(EPOCH FROM (vc.exit_time - vc.entry_time)) / 60)::INTEGER as duration_minutes,
        ROUND(
            GREATEST(0.1, LEAST(1.0,
                -- Higher confidence for more events
                (vc.event_count::DECIMAL / 10.0) * 0.3 +
                -- Higher confidence for better accuracy
                (1.0 - LEAST(1.0, vc.avg_accuracy / 100.0)) * 0.4 +
                -- Higher confidence for closer proximity
                (1.0 - LEAST(1.0, vc.avg_distance / 500.0)) * 0.3
            )),
            2
        ) as confidence,
        vc.event_count::INTEGER,
        ROUND(vc.avg_accuracy, 1) as avg_accuracy,
        vc.event_ids as location_events_ids
    FROM visit_candidates vc
    ORDER BY vc.entry_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create visit from detection result
CREATE OR REPLACE FUNCTION create_visit_from_detection(
    target_user_id UUID,
    target_account_id UUID,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    location_event_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
    visit_id UUID;
    entry_location JSONB;
    exit_location JSONB;
    first_event RECORD;
    last_event RECORD;
BEGIN
    -- Get first location event for entry location
    SELECT latitude, longitude, accuracy INTO first_event
    FROM location_events 
    WHERE id = location_event_ids[1];
    
    entry_location = json_build_object(
        'latitude', first_event.latitude,
        'longitude', first_event.longitude,
        'accuracy', first_event.accuracy
    );
    
    -- Get last location event for exit location (if different from first)
    IF array_length(location_event_ids, 1) > 1 THEN
        SELECT latitude, longitude, accuracy INTO last_event
        FROM location_events 
        WHERE id = location_event_ids[array_length(location_event_ids, 1)];
        
        exit_location = json_build_object(
            'latitude', last_event.latitude,
            'longitude', last_event.longitude,
            'accuracy', last_event.accuracy
        );
    END IF;
    
    -- Create the visit
    INSERT INTO visits (
        user_id, 
        account_id, 
        check_in_time, 
        check_out_time, 
        check_in_location, 
        check_out_location
    )
    VALUES (
        target_user_id,
        target_account_id,
        entry_time,
        exit_time,
        entry_location,
        exit_location
    )
    RETURNING id INTO visit_id;
    
    -- Update location events to reference this visit
    UPDATE location_events 
    SET visit_id = create_visit_from_detection.visit_id,
        processed = true
    WHERE id = ANY(location_event_ids);
    
    RETURN visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process unprocessed location events
CREATE OR REPLACE FUNCTION process_location_events_for_visits()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    user_record RECORD;
    visit_record RECORD;
    new_visit_id UUID;
BEGIN
    -- Process each user with unprocessed events
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM location_events 
        WHERE processed = false
    LOOP
        -- Detect visits for this user
        FOR visit_record IN 
            SELECT * FROM detect_visits_from_location_events(user_record.user_id, 2)
            WHERE confidence >= 0.5  -- Only process high confidence detections
        LOOP
            -- Check if visit already exists for this time period
            IF NOT EXISTS (
                SELECT 1 FROM visits 
                WHERE user_id = user_record.user_id 
                  AND account_id = visit_record.account_id
                  AND check_in_time <= visit_record.exit_time
                  AND (check_out_time IS NULL OR check_out_time >= visit_record.entry_time)
            ) THEN
                -- Create the visit
                SELECT create_visit_from_detection(
                    user_record.user_id,
                    visit_record.account_id,
                    visit_record.entry_time,
                    visit_record.exit_time,
                    visit_record.location_events_ids
                ) INTO new_visit_id;
                
                processed_count := processed_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;