-- Phase 3: Overlap resolution + speed gating for visit detection
-- - Break sessions on high-speed legs (likely transit)
-- - Resolve overlapping visits across accounts by preferring closer (and then higher-confidence) sessions

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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    min_dwell_minutes INTEGER := 10;       -- minimum dwell time to accept a visit
    gap_minutes INTEGER := 60;             -- start a new session if gap > this
    margin_meters INTEGER := 50;           -- buffer added to geofence radius
    min_radius_m INTEGER := 50;            -- lower bound for geofence radius used
    max_radius_m INTEGER := 500;           -- upper bound for geofence radius used
    max_duration_minutes INTEGER := 480;   -- cap session duration (8 hours)
    speed_threshold_kmh NUMERIC := 45;     -- break sessions when estimated speed exceeds this
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
            a.id AS acct_id,
            a.account_name,
            a.geofence_radius,
            LEAST(GREATEST(a.geofence_radius, min_radius_m), max_radius_m) AS radius_used_m,
            ST_Distance(
                ST_Point(le.longitude, le.latitude)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) AS distance_meters
        FROM location_events le
        INNER JOIN user_accounts ua ON ua.user_id = le.user_id
        INNER JOIN accounts a ON a.id = ua.account_id
        WHERE le.user_id = detect_visits_from_location_events.target_user_id
          AND le.timestamp >= NOW() - INTERVAL '1 hour' * detect_visits_from_location_events.time_window_hours
          AND ua.is_active = true
          AND a.is_active = true
          AND ST_DWithin(
                ST_Point(le.longitude, le.latitude)::geography,
                ST_Point(a.longitude, a.latitude)::geography,
                (LEAST(GREATEST(a.geofence_radius, min_radius_m), max_radius_m) + margin_meters)
          )
    ),
    sequenced AS (
        SELECT
            lea.event_id,
            lea.user_id,
            lea.timestamp,
            lea.latitude,
            lea.longitude,
            lea.accuracy,
            lea.acct_id,
            lea.account_name,
            lea.geofence_radius,
            lea.radius_used_m,
            lea.distance_meters,
            -- compute leg distance/time to infer speed between points for same account
            ST_Distance(
                ST_Point(lea.longitude, lea.latitude)::geography,
                ST_Point(LAG(lea.longitude) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp),
                         LAG(lea.latitude)  OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp))::geography
            ) AS leg_distance_m,
            EXTRACT(EPOCH FROM (
                lea.timestamp - LAG(lea.timestamp) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp)
            )) AS leg_seconds,
            CASE
                WHEN LAG(lea.timestamp) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp) IS NULL THEN 0
                WHEN EXTRACT(EPOCH FROM (
                        lea.timestamp
                      - LAG(lea.timestamp) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp)
                    )) / 60 > gap_minutes THEN 1
                WHEN (
                    -- speed km/h = (leg_distance_m * 3.6) / leg_seconds
                    CASE WHEN EXTRACT(EPOCH FROM (lea.timestamp - LAG(lea.timestamp) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp))) > 0
                         THEN (ST_Distance(
                                ST_Point(lea.longitude, lea.latitude)::geography,
                                ST_Point(LAG(lea.longitude) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp),
                                         LAG(lea.latitude)  OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp))::geography
                              ) * 3.6) / EXTRACT(EPOCH FROM (lea.timestamp - LAG(lea.timestamp) OVER (PARTITION BY lea.acct_id ORDER BY lea.timestamp)))
                         ELSE 0 END
                ) > speed_threshold_kmh THEN 1
                ELSE 0
            END AS is_break
        FROM location_events_with_accounts lea
    ),
    sessioned AS (
        SELECT
            s.event_id,
            s.user_id,
            s.timestamp,
            s.latitude,
            s.longitude,
            s.accuracy,
            s.acct_id,
            s.account_name,
            s.geofence_radius,
            s.radius_used_m,
            s.distance_meters,
            s.is_break,
            SUM(s.is_break) OVER (
                PARTITION BY s.acct_id
                ORDER BY s.timestamp
                ROWS UNBOUNDED PRECEDING
            ) AS session_index
        FROM sequenced s
    ),
    visit_candidates AS (
        SELECT
            s.user_id AS vc_user_id,
            s.acct_id AS vc_account_id,
            MIN(s.timestamp) AS vc_entry_time,
            MAX(s.timestamp) AS vc_exit_time,
            COUNT(*) AS vc_event_count,
            AVG(s.accuracy) AS vc_avg_accuracy,
            AVG(s.distance_meters) AS vc_avg_distance,
            AVG(s.radius_used_m) AS vc_radius_used_m,
            ARRAY_AGG(s.event_id ORDER BY s.timestamp) AS vc_event_ids
        FROM sessioned s
        GROUP BY s.user_id, s.acct_id, s.session_index
        HAVING COUNT(*) >= 2
           AND EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp))) / 60 >= min_dwell_minutes
           AND EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp))) / 60 <= max_duration_minutes
    ),
    scored AS (
        SELECT
            vc.vc_user_id,
            vc.vc_account_id,
            a.account_name,
            vc.vc_entry_time,
            vc.vc_exit_time,
            vc.vc_event_count,
            vc.vc_avg_accuracy,
            vc.vc_avg_distance,
            vc.vc_radius_used_m,
            -- composite confidence
            ROUND((GREATEST(0.1, LEAST(1.0,
                (vc.vc_event_count::numeric / 10.0) * 0.3 +
                (1.0 - LEAST(1.0, (vc.vc_avg_accuracy::numeric / 100.0))) * 0.4 +
                (1.0 - LEAST(1.0, (vc.vc_avg_distance::numeric / GREATEST(100.0, vc.vc_radius_used_m::numeric)))) * 0.3
            )))::numeric, 2) AS confidence,
            vc.vc_event_ids
        FROM visit_candidates vc
        JOIN accounts a ON a.id = vc.vc_account_id
    ),
    final AS (
        SELECT s.*
        FROM scored s
        WHERE NOT EXISTS (
            SELECT 1 FROM scored t
            WHERE t.vc_user_id = s.vc_user_id
              AND t.vc_account_id <> s.vc_account_id
              AND tstzrange(t.vc_entry_time, t.vc_exit_time, '[]') && tstzrange(s.vc_entry_time, s.vc_exit_time, '[]')
              AND (
                    -- prefer lower avg distance (with 10m tie-break window), then higher confidence
                    t.vc_avg_distance < s.vc_avg_distance - 10
                 OR (abs(t.vc_avg_distance - s.vc_avg_distance) <= 10 AND t.confidence > s.confidence)
              )
        )
    )
    SELECT
        f.vc_account_id AS account_id,
        f.account_name,
        f.vc_entry_time AS entry_time,
        f.vc_exit_time AS exit_time,
        ROUND(EXTRACT(EPOCH FROM (f.vc_exit_time - f.vc_entry_time)) / 60)::INTEGER AS duration_minutes,
        f.confidence,
        f.vc_event_count::integer AS event_count,
        ROUND(f.vc_avg_accuracy::numeric, 1) AS avg_accuracy,
        f.vc_event_ids AS location_events_ids
    FROM final f
    ORDER BY f.vc_entry_time DESC;
END;
$$;
