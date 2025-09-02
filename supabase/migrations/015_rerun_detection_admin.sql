-- Phase 5 helper: Admin re-run detection in a date range for a user
-- Unlinks existing visits overlapping the range and resets events, then reprocesses.

CREATE OR REPLACE FUNCTION rerun_detection_for_user_range(
  target_user_id UUID,
  start_ts TIMESTAMPTZ,
  end_ts   TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  deleted_visits INT := 0;
  reset_events   INT := 0;
  processed_new  INT := 0;
BEGIN
  -- Delete overlapping visits for the user (ON DELETE SET NULL will unlink events)
  DELETE FROM visits v
  WHERE v.user_id = target_user_id
    AND v.check_in_time <= end_ts
    AND (v.check_out_time IS NULL OR v.check_out_time >= start_ts);
  GET DIAGNOSTICS deleted_visits = ROW_COUNT;

  -- Reset location events in the range for the user
  UPDATE location_events le
  SET visit_id = NULL,
      processed = false
  WHERE le.user_id = target_user_id
    AND le.timestamp >= start_ts
    AND le.timestamp <= end_ts;
  GET DIAGNOSTICS reset_events = ROW_COUNT;

  -- Re-run processing (global) which will pick up unprocessed events
  processed_new := process_location_events_for_visits();

  RETURN jsonb_build_object(
    'deleted_visits', deleted_visits,
    'reset_events', reset_events,
    'processed', processed_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

