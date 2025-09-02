-- Update visit detection to use per-account geofence radii and
-- split visits into sessions based on time gaps between events.

-- This replaces the proximity filter (previously fixed ~1000m)
-- with `a.geofence_radius + margin_meters`, and introduces a
-- session index that starts a new session when the gap between
-- consecutive events for the same account exceeds `gap_minutes`.

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
    min_dwell_minutes INTEGER := 10;   -- minimum dwell time to consider a visit
    gap_minutes INTEGER := 60;         -- split sessions when gap between events exceeds this
    margin_meters INTEGER := 50;       -- small buffer added to the geofence radius
BEGIN
    RETURN QUERY
    WITH location_events_with_accounts AS (
        SELECT 
            le.id AS event_id,
            le.user_id,
            le.timestamp,
            le.latitude,
            le.longitude,
            le.accuracy,
            a.id AS account_id,
            a.account_name,
            a.geofence_radius,
            ST_Distance(
                ST_Point(le.longitude, le.latitude)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) AS distance_meters
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
                (a.geofence_radius + margin_meters)
          )
    ),
    sequenced AS (
        SELECT
            lea.*,
            CASE
                WHEN LAG(lea.timestamp) OVER (PARTITION BY lea.account_id ORDER BY lea.timestamp) IS NULL THEN 0
                WHEN EXTRACT(EPOCH FROM (
                        lea.timestamp - LAG(lea.timestamp) OVER (PARTITION BY lea.account_id ORDER BY lea.timestamp)
                    )) / 60 > gap_minutes THEN 1
                ELSE 0
            END AS is_break
        FROM location_events_with_accounts lea
    ),
    sessioned AS (
        SELECT
            s.*,
            SUM(is_break) OVER (
                PARTITION BY s.account_id
                ORDER BY s.timestamp
                ROWS UNBOUNDED PRECEDING
            ) AS session_index
        FROM sequenced s
    ),
    visit_candidates AS (
        SELECT 
            account_id,
            MIN(timestamp) AS entry_time,
            MAX(timestamp) AS exit_time,
            COUNT(*) AS event_count,
            AVG(accuracy) AS avg_accuracy,
            AVG(distance_meters) AS avg_distance,
            ARRAY_AGG(event_id ORDER BY timestamp) AS event_ids
        FROM sessioned
        GROUP BY account_id, session_index
        HAVING COUNT(*) >= 2  -- at least 2 events
           AND EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 >= min_dwell_minutes
    )
    SELECT 
        vc.account_id,
        a.account_name,
        vc.entry_time,
        vc.exit_time,
        ROUND(EXTRACT(EPOCH FROM (vc.exit_time - vc.entry_time)) / 60)::INTEGER AS duration_minutes,
        ROUND(
            GREATEST(0.1, LEAST(1.0,
                -- Higher confidence for more events
                (vc.event_count::DECIMAL / 10.0) * 0.3 +
                -- Higher confidence for better accuracy
                (1.0 - LEAST(1.0, vc.avg_accuracy / 100.0)) * 0.4 +
                -- Higher confidence for closer proximity relative to geofence radius (with floor)
                (1.0 - LEAST(1.0, vc.avg_distance / GREATEST(100.0, a.geofence_radius::DECIMAL))) * 0.3
            )),
            2
        ) AS confidence,
        vc.event_count::INTEGER,
        ROUND(vc.avg_accuracy, 1) AS avg_accuracy,
        vc.event_ids AS location_events_ids
    FROM visit_candidates vc
    JOIN accounts a ON a.id = vc.account_id
    ORDER BY vc.entry_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

