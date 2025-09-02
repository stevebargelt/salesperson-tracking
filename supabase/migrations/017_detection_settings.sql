-- Phase 7: Pilot rollout — per-user detection settings

CREATE TABLE IF NOT EXISTS detection_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  min_dwell_minutes INTEGER,
  gap_minutes INTEGER,
  buffer_meters INTEGER,
  min_radius_m INTEGER,
  max_radius_m INTEGER,
  max_duration_minutes INTEGER,
  speed_threshold_kmh NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper: return effective settings for a user, with defaults if null
CREATE OR REPLACE FUNCTION get_effective_detection_settings(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  s RECORD;
  def_min_dwell INTEGER := 10;
  def_gap INTEGER := 60;
  def_buffer INTEGER := 50;
  def_min_radius INTEGER := 50;
  def_max_radius INTEGER := 500;
  def_max_duration INTEGER := 480;
  def_speed NUMERIC := 45;
BEGIN
  SELECT * INTO s FROM detection_settings WHERE user_id = target_user_id;
  RETURN jsonb_build_object(
    'enabled', COALESCE(s.enabled, true),
    'min_dwell_minutes', COALESCE(s.min_dwell_minutes, def_min_dwell),
    'gap_minutes', COALESCE(s.gap_minutes, def_gap),
    'buffer_meters', COALESCE(s.buffer_meters, def_buffer),
    'min_radius_m', COALESCE(s.min_radius_m, def_min_radius),
    'max_radius_m', COALESCE(s.max_radius_m, def_max_radius),
    'max_duration_minutes', COALESCE(s.max_duration_minutes, def_max_duration),
    'speed_threshold_kmh', COALESCE(s.speed_threshold_kmh, def_speed)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

