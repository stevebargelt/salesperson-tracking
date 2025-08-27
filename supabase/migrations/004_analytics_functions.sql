-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (
            SELECT COUNT(*) FROM profiles WHERE role = 'salesperson' AND is_active = true
        ),
        'total_accounts', (
            SELECT COUNT(*) FROM accounts WHERE is_active = true
        ),
        'total_visits_today', (
            SELECT COUNT(*) FROM visits 
            WHERE DATE(check_in_time) = CURRENT_DATE
        ),
        'total_visits_this_week', (
            SELECT COUNT(*) FROM visits 
            WHERE check_in_time >= DATE_TRUNC('week', CURRENT_DATE)
        ),
        'active_users_now', (
            SELECT COUNT(DISTINCT user_id) FROM location_events 
            WHERE timestamp >= NOW() - INTERVAL '1 hour'
        ),
        'average_visit_duration', (
            SELECT ROUND(AVG(duration_minutes), 1) FROM visits 
            WHERE duration_minutes IS NOT NULL 
              AND check_in_time >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'total_location_events_today', (
            SELECT COUNT(*) FROM location_events 
            WHERE DATE(timestamp) = CURRENT_DATE
        ),
        'unprocessed_events', (
            SELECT COUNT(*) FROM location_events WHERE processed = false
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get visit summary with filters
CREATE OR REPLACE FUNCTION get_visit_summary(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    account_id UUID,
    account_name TEXT,
    total_visits INTEGER,
    total_duration_minutes INTEGER,
    last_visit TIMESTAMPTZ,
    average_duration_minutes DECIMAL,
    first_visit TIMESTAMPTZ
) AS $$
DECLARE
    date_filter TEXT := '';
    user_filter TEXT := '';
BEGIN
    -- Build dynamic filters
    IF start_date IS NOT NULL THEN
        date_filter := date_filter || ' AND v.check_in_time >= ''' || start_date || '''';
    END IF;
    
    IF end_date IS NOT NULL THEN
        date_filter := date_filter || ' AND v.check_in_time <= ''' || end_date || ' 23:59:59''';
    END IF;
    
    IF target_user_id IS NOT NULL THEN
        user_filter := ' AND v.user_id = ''' || target_user_id || '''';
    END IF;

    RETURN QUERY EXECUTE '
        SELECT 
            v.user_id,
            p.full_name as user_name,
            v.account_id,
            a.account_name,
            COUNT(v.id)::INTEGER as total_visits,
            COALESCE(SUM(v.duration_minutes), 0)::INTEGER as total_duration_minutes,
            MAX(v.check_in_time) as last_visit,
            ROUND(AVG(v.duration_minutes), 1) as average_duration_minutes,
            MIN(v.check_in_time) as first_visit
        FROM visits v
        INNER JOIN profiles p ON p.id = v.user_id
        INNER JOIN accounts a ON a.id = v.account_id
        WHERE 1=1 ' || date_filter || user_filter || '
        GROUP BY v.user_id, p.full_name, v.account_id, a.account_name
        ORDER BY total_visits DESC, last_visit DESC';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user location status
CREATE OR REPLACE FUNCTION get_user_location_status()
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    last_seen TIMESTAMPTZ,
    current_latitude DECIMAL,
    current_longitude DECIMAL,
    current_accuracy DECIMAL,
    is_at_account BOOLEAN,
    current_account_id UUID,
    current_account_name TEXT,
    minutes_since_last_update INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_locations AS (
        SELECT DISTINCT ON (le.user_id)
            le.user_id,
            le.timestamp,
            le.latitude,
            le.longitude,
            le.accuracy
        FROM location_events le
        INNER JOIN profiles p ON p.id = le.user_id
        WHERE p.role = 'salesperson' 
          AND p.is_active = true
          AND le.timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY le.user_id, le.timestamp DESC
    ),
    current_account_status AS (
        SELECT 
            ll.user_id,
            ll.timestamp,
            ll.latitude,
            ll.longitude,
            ll.accuracy,
            a.id as account_id,
            a.account_name,
            ST_Distance(
                ST_Point(ll.longitude, ll.latitude)::geography,
                ST_Point(a.longitude, a.latitude)::geography
            ) <= a.geofence_radius as is_inside
        FROM latest_locations ll
        LEFT JOIN user_accounts ua ON ua.user_id = ll.user_id AND ua.is_active = true
        LEFT JOIN accounts a ON a.id = ua.account_id AND a.is_active = true
        WHERE ua.account_id IS NULL 
           OR ST_DWithin(
               ST_Point(ll.longitude, ll.latitude)::geography,
               ST_Point(a.longitude, a.latitude)::geography,
               2000  -- 2km search radius
           )
    )
    SELECT 
        p.id as user_id,
        p.full_name as user_name,
        COALESCE(cas.timestamp, '1970-01-01'::timestamptz) as last_seen,
        cas.latitude as current_latitude,
        cas.longitude as current_longitude,
        cas.accuracy as current_accuracy,
        COALESCE(cas.is_inside, false) as is_at_account,
        cas.account_id as current_account_id,
        cas.account_name as current_account_name,
        CASE 
            WHEN cas.timestamp IS NOT NULL THEN
                ROUND(EXTRACT(EPOCH FROM (NOW() - cas.timestamp)) / 60)::INTEGER
            ELSE NULL
        END as minutes_since_last_update
    FROM profiles p
    LEFT JOIN current_account_status cas ON cas.user_id = p.id
    WHERE p.role = 'salesperson' AND p.is_active = true
    ORDER BY cas.timestamp DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get visit timeline for a user
CREATE OR REPLACE FUNCTION get_user_visit_timeline(
    target_user_id UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    visit_id UUID,
    account_id UUID,
    account_name TEXT,
    account_address TEXT,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    visit_notes TEXT,
    day_of_week TEXT,
    time_of_day TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as visit_id,
        v.account_id,
        a.account_name,
        a.address as account_address,
        v.check_in_time,
        v.check_out_time,
        v.duration_minutes,
        v.visit_notes,
        TO_CHAR(v.check_in_time, 'Day') as day_of_week,
        TO_CHAR(v.check_in_time, 'HH24:MI') as time_of_day
    FROM visits v
    INNER JOIN accounts a ON a.id = v.account_id
    WHERE v.user_id = target_user_id
      AND v.check_in_time >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ORDER BY v.check_in_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get account visit frequency
CREATE OR REPLACE FUNCTION get_account_visit_frequency(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    account_id UUID,
    account_name TEXT,
    account_address TEXT,
    total_visits INTEGER,
    unique_visitors INTEGER,
    avg_visit_duration DECIMAL,
    last_visit TIMESTAMPTZ,
    visits_this_week INTEGER,
    most_frequent_visitor TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as account_id,
        a.account_name,
        a.address as account_address,
        COUNT(v.id)::INTEGER as total_visits,
        COUNT(DISTINCT v.user_id)::INTEGER as unique_visitors,
        ROUND(AVG(v.duration_minutes), 1) as avg_visit_duration,
        MAX(v.check_in_time) as last_visit,
        COUNT(CASE WHEN v.check_in_time >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END)::INTEGER as visits_this_week,
        (
            SELECT p.full_name 
            FROM visits v2 
            INNER JOIN profiles p ON p.id = v2.user_id
            WHERE v2.account_id = a.id 
              AND v2.check_in_time >= CURRENT_DATE - INTERVAL '1 day' * days_back
            GROUP BY v2.user_id, p.full_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_frequent_visitor
    FROM accounts a
    LEFT JOIN visits v ON v.account_id = a.id 
        AND v.check_in_time >= CURRENT_DATE - INTERVAL '1 day' * days_back
    WHERE a.is_active = true
    GROUP BY a.id, a.account_name, a.address
    ORDER BY total_visits DESC, last_visit DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export visits data (for reports)
CREATE OR REPLACE FUNCTION export_visits_data(
    start_date DATE,
    end_date DATE,
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_name TEXT,
    user_email TEXT,
    account_name TEXT,
    account_address TEXT,
    account_city TEXT,
    account_state TEXT,
    check_in_time TEXT,
    check_out_time TEXT,
    duration_minutes INTEGER,
    day_of_week TEXT,
    business_hours BOOLEAN,
    visit_notes TEXT
) AS $$
DECLARE
    user_filter TEXT := '';
BEGIN
    IF target_user_id IS NOT NULL THEN
        user_filter := ' AND v.user_id = ''' || target_user_id || '''';
    END IF;

    RETURN QUERY EXECUTE '
        SELECT 
            p.full_name as user_name,
            p.email as user_email,
            a.account_name,
            a.address as account_address,
            a.city as account_city,
            a.state as account_state,
            TO_CHAR(v.check_in_time, ''YYYY-MM-DD HH24:MI:SS'') as check_in_time,
            CASE 
                WHEN v.check_out_time IS NOT NULL THEN
                    TO_CHAR(v.check_out_time, ''YYYY-MM-DD HH24:MI:SS'')
                ELSE NULL
            END as check_out_time,
            v.duration_minutes,
            TO_CHAR(v.check_in_time, ''Day'') as day_of_week,
            CASE 
                WHEN EXTRACT(DOW FROM v.check_in_time) BETWEEN 1 AND 5 
                     AND EXTRACT(HOUR FROM v.check_in_time) BETWEEN 9 AND 17 
                THEN true 
                ELSE false 
            END as business_hours,
            v.visit_notes
        FROM visits v
        INNER JOIN profiles p ON p.id = v.user_id
        INNER JOIN accounts a ON a.id = v.account_id
        WHERE v.check_in_time >= ''' || start_date || '''
          AND v.check_in_time <= ''' || end_date || ' 23:59:59''
          ' || user_filter || '
        ORDER BY p.full_name, v.check_in_time DESC';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;