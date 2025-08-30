-- Fix ROUND() usage by casting double precision expressions to numeric before applying scale
-- Addresses error: function round(double precision, integer) does not exist

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
    min_dwell_minutes INTEGER := 5;  -- keep in sync with tuning
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
        HAVING COUNT(*) >= 2
           AND EXTRACT(EPOCH FROM (MAX(lea.timestamp) - MIN(lea.timestamp))) / 60 >= min_dwell_minutes
    )
    SELECT 
        vc.account_id,
        vc.account_name,
        vc.entry_time,
        vc.exit_time,
        ROUND(EXTRACT(EPOCH FROM (vc.exit_time - vc.entry_time)) / 60)::INTEGER as duration_minutes,
        ROUND(
            (
                GREATEST(0.1, LEAST(1.0,
                    (vc.event_count::DECIMAL / 10.0) * 0.3 +
                    (1.0 - LEAST(1.0, (vc.avg_accuracy::DECIMAL / 100.0))) * 0.4 +
                    (1.0 - LEAST(1.0, (vc.avg_distance::DECIMAL / 500.0))) * 0.3
                ))
            )::NUMERIC,
            2
        ) as confidence,
        vc.event_count::INTEGER,
        ROUND((vc.avg_accuracy)::NUMERIC, 1) as avg_accuracy,
        vc.event_ids as location_events_ids
    FROM visit_candidates vc
    ORDER BY vc.entry_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

