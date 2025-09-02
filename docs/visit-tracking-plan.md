# Visit Tracking Improvement Plan

This plan drives accuracy and reliability for visit detection while keeping device battery usage low and server logic auditable.

## Phase 1 — Detection Engine (Now)

- [ ] Apply migration 010_sessionized_visit_detection.sql in Supabase.
  - Switch proximity to `a.geofence_radius + 50` meters.
  - Sessionize per account: new session when gap > 60 minutes.
  - Keep min dwell ≥ 10 minutes and ≥ 2 events.
- [ ] Validate on recent data (7 days):
  - Detector preview: `detect_visits_from_location_events(user, 24)`
  - Long visits gone; durations realistic (10–120 min typical).
  - Edge users/accounts spot-checked.

## Phase 2 — Safeguards & Tunables

- [ ] Add max visit duration cap (e.g., 8h) with auto-split.
- [ ] Bound radius per account (e.g., min 50m, max 500m).
- [ ] Make `gap_minutes`, `min_dwell`, and `buffer_meters` configurable.

## Phase 3 — Overlap & Motion Awareness

- [ ] Overlap resolution across nearby accounts:
  - Choose account with lowest median distance and highest confidence.
  - If ambiguous, flag for review.
- [ ] Speed gating:
  - Break or down-weight events when inferred speed > X km/h (transit).

## Phase 4 — Client Refinements (Battery‑Safe)

- [ ] High-accuracy burst when within ~2× geofence radius (once per 10–15 min/account).
- [ ] Optional iOS region monitoring for small assigned sets (rotate nearest N).
- [ ] Filter events with very poor accuracy (>150–200m) unless needed.

## Phase 5 — Observability & Tooling

- [ ] Persist audit fields on visits: detection version, event_count, median distance, avg accuracy, inside ratio, chosen thresholds.
- [ ] Add `detection_explanations` JSONB for debugging decisions.
- [ ] Admin inspector UI: plot session events, distances, reasons accepted/rejected, re-run tools.

## Phase 6 — Metrics & Operations

- [ ] Cron idempotency + reprocess window (last 7–14 days) by detection version.
- [ ] Dashboards: visits/user/day, duration distribution, overlap rate, capped/split rate.
- [ ] Alerts for anomalies (e.g., many visits > 8h, sudden drop in visits).

## Phase 7 — Pilot & Tuning

- [ ] Pilot with subset of users; collect feedback.
- [ ] Tune `gap_minutes`, `min_dwell`, buffer, speed thresholds.
- [ ] Success criteria: 
  - Eliminate all‑day 20h visits (unless legitimate).
  - ≥90% visits match ground truth within 10–15 minutes.
  - Overlap false positives reduced by >50%.

## Notes

- Keep SLC as primary signal for battery life; server does the heavy lifting.
- Consider polygon geofences for complex sites in later iterations.

