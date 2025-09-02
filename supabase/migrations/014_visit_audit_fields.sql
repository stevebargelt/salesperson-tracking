-- Phase 4: Observability — add audit fields to visits and store detection metadata

-- 1) Add audit columns to visits (nullable for backward compatibility)
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS detection_version INTEGER,
  ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS detection_event_count INTEGER,
  ADD COLUMN IF NOT EXISTS detection_avg_accuracy NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS detection_info JSONB;

-- 2) New helper to create a visit with detection metadata
CREATE OR REPLACE FUNCTION create_visit_from_detection_v2(
    target_user_id UUID,
    target_account_id UUID,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    location_event_ids UUID[],
    det_version INTEGER,
    det_confidence NUMERIC,
    det_event_count INTEGER,
    det_avg_accuracy NUMERIC,
    det_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    visit_id UUID;
    entry_location JSONB;
    exit_location JSONB;
    first_event RECORD;
    last_event RECORD;
BEGIN
    -- Entry location from first event
    SELECT latitude, longitude, accuracy INTO first_event
    FROM location_events 
    WHERE id = location_event_ids[1];

    entry_location = json_build_object(
        'latitude', first_event.latitude,
        'longitude', first_event.longitude,
        'accuracy', first_event.accuracy
    );

    -- Exit location from last event (if different)
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

    INSERT INTO visits (
        user_id,
        account_id,
        check_in_time,
        check_out_time,
        check_in_location,
        check_out_location,
        detection_version,
        detection_confidence,
        detection_event_count,
        detection_avg_accuracy,
        detection_info
    )
    VALUES (
        target_user_id,
        target_account_id,
        entry_time,
        exit_time,
        entry_location,
        exit_location,
        det_version,
        det_confidence,
        det_event_count,
        det_avg_accuracy,
        det_info
    )
    RETURNING id INTO visit_id;

    -- Mark events as processed and link them
    UPDATE location_events 
    SET visit_id = visit_id,
        processed = true
    WHERE id = ANY(location_event_ids);

    RETURN visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Update processing to use v2 with metadata from detector
CREATE OR REPLACE FUNCTION process_location_events_for_visits()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    user_record RECORD;
    visit_record RECORD;
    new_visit_id UUID;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM location_events 
        WHERE processed = false
    LOOP
        FOR visit_record IN 
            SELECT * FROM detect_visits_from_location_events(user_record.user_id, 24)
            WHERE confidence >= 0.5
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM visits 
                WHERE user_id = user_record.user_id 
                  AND account_id = visit_record.account_id
                  AND check_in_time <= visit_record.exit_time
                  AND (check_out_time IS NULL OR check_out_time >= visit_record.entry_time)
            ) THEN
                SELECT create_visit_from_detection_v2(
                    user_record.user_id,
                    visit_record.account_id,
                    visit_record.entry_time,
                    visit_record.exit_time,
                    visit_record.location_events_ids,
                    3, -- detection version
                    visit_record.confidence,
                    visit_record.event_count,
                    visit_record.avg_accuracy,
                    jsonb_build_object('source', 'sessionized_v3')
                ) INTO new_visit_id;

                processed_count := processed_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

