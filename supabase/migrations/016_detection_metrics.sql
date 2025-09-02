-- Phase 6: Metrics — detection quality metrics over a time window

CREATE OR REPLACE FUNCTION get_detection_metrics(hours_back INTEGER DEFAULT 24)
RETURNS JSONB AS $$
DECLARE
  since_ts TIMESTAMPTZ := NOW() - (hours_back || ' hours')::interval;
  total_visits INT;
  p50 NUMERIC;
  p95 NUMERIC;
  avg_conf NUMERIC;
  buckets JSONB;
  long_visits INT;
  low_conf INT;
  low_events INT;
  overlap_visits INT;
BEGIN
  -- Base set: visits created in window
  SELECT COUNT(*) INTO total_visits
  FROM visits v
  WHERE v.created_at >= since_ts;

  -- Percentiles and averages (ignore nulls)
  SELECT 
    percentile_disc(0.5) WITHIN GROUP (ORDER BY v.duration_minutes) AS p50_val,
    percentile_disc(0.95) WITHIN GROUP (ORDER BY v.duration_minutes) AS p95_val
  INTO p50, p95
  FROM visits v
  WHERE v.created_at >= since_ts AND v.duration_minutes IS NOT NULL;

  SELECT AVG(v.detection_confidence) INTO avg_conf
  FROM visits v
  WHERE v.created_at >= since_ts AND v.detection_confidence IS NOT NULL;

  -- Duration buckets
  SELECT jsonb_build_object(
    'm0_10',  SUM(CASE WHEN v.duration_minutes IS NOT NULL AND v.duration_minutes < 10  THEN 1 ELSE 0 END),
    'm10_30', SUM(CASE WHEN v.duration_minutes >= 10  AND v.duration_minutes < 30  THEN 1 ELSE 0 END),
    'm30_60', SUM(CASE WHEN v.duration_minutes >= 30  AND v.duration_minutes < 60  THEN 1 ELSE 0 END),
    'm60_120',SUM(CASE WHEN v.duration_minutes >= 60  AND v.duration_minutes < 120 THEN 1 ELSE 0 END),
    'm120_plus',SUM(CASE WHEN v.duration_minutes >= 120 THEN 1 ELSE 0 END)
  )
  INTO buckets
  FROM visits v
  WHERE v.created_at >= since_ts;

  -- Anomalies (align with dashboard)
  SELECT 
    SUM(CASE WHEN v.duration_minutes IS NOT NULL AND v.duration_minutes > 480 THEN 1 ELSE 0 END),
    SUM(CASE WHEN v.detection_confidence IS NOT NULL AND v.detection_confidence < 0.5 THEN 1 ELSE 0 END),
    SUM(CASE WHEN v.detection_event_count IS NOT NULL AND v.detection_event_count < 2 THEN 1 ELSE 0 END)
  INTO long_visits, low_conf, low_events
  FROM visits v
  WHERE v.created_at >= since_ts;

  -- Overlap rate: count visits that overlap in time with another visit for the same user (should be ~0)
  WITH w AS (
    SELECT v.id, v.user_id, v.check_in_time, COALESCE(v.check_out_time, v.check_in_time + interval '5 minutes') AS end_time
    FROM visits v
    WHERE v.created_at >= since_ts
  ),
  overlaps AS (
    SELECT DISTINCT a.id
    FROM w a
    JOIN w b ON a.user_id = b.user_id AND a.id <> b.id
      AND tstzrange(a.check_in_time, a.end_time, '[]') && tstzrange(b.check_in_time, b.end_time, '[]')
  )
  SELECT COUNT(*) INTO overlap_visits FROM overlaps;

  RETURN jsonb_build_object(
    'since', since_ts,
    'total_visits', COALESCE(total_visits, 0),
    'p50_duration', COALESCE(p50, 0),
    'p95_duration', COALESCE(p95, 0),
    'avg_confidence', COALESCE(avg_conf, 0),
    'duration_buckets', COALESCE(buckets, '{}'::jsonb),
    'anomalies', jsonb_build_object(
      'longVisits', COALESCE(long_visits, 0),
      'lowConfidence', COALESCE(low_conf, 0),
      'lowEvents', COALESCE(low_events, 0),
      'overlapVisits', COALESCE(overlap_visits, 0)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

