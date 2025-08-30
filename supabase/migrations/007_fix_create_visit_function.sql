-- Fix bug in create_visit_from_detection: update used an invalid reference
-- Error observed: missing FROM-clause entry for table "create_visit_from_detection"
-- Root cause: used create_visit_from_detection.visit_id instead of local variable

CREATE OR REPLACE FUNCTION create_visit_from_detection(
    target_user_id UUID,
    target_account_id UUID,
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    location_event_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
    new_visit_id UUID;
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
    RETURNING id INTO new_visit_id;
    
    -- Update location events to reference this visit and mark processed
    UPDATE location_events 
    SET visit_id = new_visit_id,
        processed = true
    WHERE id = ANY(location_event_ids);
    
    RETURN new_visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

