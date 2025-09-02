import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { supabase } from '@salesperson-tracking/supabase'
import { formatDateTime, formatDuration } from '@salesperson-tracking/utils'

type VisitRecord = {
  id: string
  user_id: string
  account_id: string
  check_in_time: string
  check_out_time: string | null
  duration_minutes: number | null
  detection_version?: number | null
  detection_confidence?: number | null
  detection_event_count?: number | null
  detection_avg_accuracy?: number | null
  detection_info?: any | null
  profiles?: { full_name: string; email: string }
  accounts?: { account_name: string; address: string; city: string; state: string; geofence_radius?: number; latitude?: number; longitude?: number }
}

type EventRow = {
  id: string
  timestamp: string
  latitude: number
  longitude: number
  accuracy: number
  event_type: string
}

export const VisitInspector: React.FC = () => {
  const route = useParams()
  const [searchParams] = useSearchParams()
  const visitId = route.visitId || searchParams.get('id') || ''

  const [visit, setVisit] = useState<VisitRecord | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!visitId) { setError('Missing visit id'); setLoading(false); return }
      try {
        setError(null)
        // Load visit + relations + audit fields (nullable on older rows)
        const { data: vData, error: vErr } = await supabase
          .from('visits')
          .select(`
            id,
            user_id,
            account_id,
            check_in_time,
            check_out_time,
            duration_minutes,
            detection_version,
            detection_confidence,
            detection_event_count,
            detection_avg_accuracy,
            detection_info,
            profiles(full_name,email),
            accounts(account_name,address,city,state,geofence_radius,latitude,longitude)
          `)
          .eq('id', visitId)
          .limit(1)
          .maybeSingle()

        if (vErr) throw vErr
        setVisit(vData as any)

        const { data: eData, error: eErr } = await supabase
          .from('location_events')
          .select('id,timestamp,latitude,longitude,accuracy,event_type')
          .eq('visit_id', visitId)
          .order('timestamp', { ascending: true })

        if (eErr) throw eErr
        setEvents((eData || []) as any)
      } catch (e: any) {
        setError(e?.message || 'Failed to load visit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visitId])

  const stats = useMemo(() => {
    if (!events.length) return null
    const first = events[0]
    const last = events[events.length - 1]
    const accAvg = events.reduce((s, e) => s + (e.accuracy || 0), 0) / events.length
    return {
      firstAt: first.timestamp,
      lastAt: last.timestamp,
      count: events.length,
      avgAccuracy: accAvg,
    }
  }, [events])

  const mapUrl = useMemo(() => {
    if (!events.length) return ''
    // Center on account if available, otherwise on average of events
    const centerLat = visit?.accounts?.latitude ?? (events.reduce((s, e) => s + e.latitude, 0) / events.length)
    const centerLng = visit?.accounts?.longitude ?? (events.reduce((s, e) => s + e.longitude, 0) / events.length)

    // Sample up to 10 markers to avoid very long URLs
    const sampled: EventRow[] = []
    const maxMarkers = 10
    const step = Math.max(1, Math.floor(events.length / maxMarkers))
    for (let i = 0; i < events.length; i += step) sampled.push(events[i])
    if (sampled[sampled.length - 1]?.id !== events[events.length - 1]?.id) sampled.push(events[events.length - 1])

    const markers = [
      // First (green)
      `${events[0].latitude},${events[0].longitude},lightgreen1`,
      // Last (red)
      `${events[events.length - 1].latitude},${events[events.length - 1].longitude},red1`,
      // Others (blue)
      ...sampled.slice(1, Math.max(1, sampled.length - 1)).map(e => `${e.latitude},${e.longitude},lightblue1`),
    ]
      .map(m => `markers=${encodeURIComponent(m)}`)
      .join('&')

    const size = '640x360'
    const zoom = 14
    // OSM static map service (no key, suitable for internal tooling)
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=${zoom}&size=${size}&${markers}`
  }, [events, visit?.accounts?.latitude, visit?.accounts?.longitude])

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)

  const runPreview = async () => {
    if (!visit) return
    try {
      setPreviewError(null)
      setPreviewLoading(true)
      // Attempt to call the detector function as an RPC
      const { data, error } = await (supabase as any).rpc('detect_visits_from_location_events', {
        target_user_id: visit.user_id,
        time_window_hours: 24,
      })
      if (error) throw error
      setPreview(data || [])
    } catch (e: any) {
      setPreviewError(e?.message || 'Failed to run preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Re-run and apply (unlink + reset + process)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyMsg, setApplyMsg] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const defaultStart = useMemo(() => {
    const d = new Date(visit?.check_in_time || Date.now())
    d.setHours(0,0,0,0)
    return d
  }, [visit?.check_in_time])
  const defaultEnd = useMemo(() => {
    const d = new Date(visit?.check_in_time || Date.now())
    d.setHours(23,59,59,999)
    return d
  }, [visit?.check_in_time])

  const [rangeStart, setRangeStart] = useState<string>('')
  const [rangeEnd, setRangeEnd] = useState<string>('')

  useEffect(() => {
    const toLocalInput = (d: Date) => {
      const pad = (n: number) => (n < 10 ? '0'+n : n)
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth()+1)
      const dd = pad(d.getDate())
      const HH = pad(d.getHours())
      const MM = pad(d.getMinutes())
      return `${yyyy}-${mm}-${dd}T${HH}:${MM}`
    }
    setRangeStart(toLocalInput(defaultStart))
    setRangeEnd(toLocalInput(defaultEnd))
  }, [defaultStart, defaultEnd])

  const runApply = async () => {
    if (!visit) return
    const confirmed = window.confirm('This will delete overlapping visits for this user in the selected range, reset events, and re-run detection. Continue?')
    if (!confirmed) return
    try {
      setApplyError(null)
      setApplyMsg(null)
      setApplyLoading(true)
      const startIso = new Date(rangeStart).toISOString()
      const endIso = new Date(rangeEnd).toISOString()
      const { data, error } = await (supabase as any).rpc('rerun_detection_for_user_range', {
        target_user_id: visit.user_id,
        start_ts: startIso,
        end_ts: endIso,
      })
      if (error) throw error
      setApplyMsg(`Done. Deleted visits: ${data?.deleted_visits ?? 0}, reset events: ${data?.reset_events ?? 0}, processed: ${data?.processed ?? 0}`)
    } catch (e: any) {
      setApplyError(e?.message || 'Re-run failed')
    } finally {
      setApplyLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading…</div>
  }
  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: 8 }}>
          {error}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/visits">← Back to Visits</Link>
        </div>
      </div>
    )
  }
  if (!visit) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Visit Inspector</h1>
        <Link to="/visits">← Back to Visits</Link>
      </div>

      {/* Visit summary */}
      <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Salesperson</div>
            <div style={{ fontWeight: 600 }}>{visit.profiles?.full_name} <span style={{ color: '#6b7280', fontWeight: 400 }}>({visit.profiles?.email})</span></div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Account</div>
            <div style={{ fontWeight: 600 }}>{visit.accounts?.account_name}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{visit.accounts?.address} — {visit.accounts?.city}, {visit.accounts?.state}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Geofence radius</div>
            <div>{visit.accounts?.geofence_radius ?? '—'} m</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Check-in</div>
            <div>{formatDateTime(visit.check_in_time)}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Check-out</div>
            <div>{visit.check_out_time ? formatDateTime(visit.check_out_time) : '—'}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Duration</div>
            <div>{visit.duration_minutes ? formatDuration(visit.duration_minutes) : '—'}</div>
          </div>
        </div>
      </div>

      {/* Map */}
      {mapUrl ? (
        <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Map</h2>
          <div style={{ overflowX: 'auto' }}>
            <img src={mapUrl} alt="Visit Map" style={{ maxWidth: '100%', borderRadius: 6 }} />
          </div>
        </div>
      ) : null}

      {/* Detection audit */}
      <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Detection Audit</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Version</div>
            <div>{visit.detection_version ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Confidence</div>
            <div>{visit.detection_confidence != null ? Number(visit.detection_confidence).toFixed(2) : '—'}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Event count</div>
            <div>{visit.detection_event_count ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Avg accuracy (m)</div>
            <div>{visit.detection_avg_accuracy != null ? Number(visit.detection_avg_accuracy).toFixed(1) : '—'}</div>
          </div>
        </div>
        {visit.detection_info ? (
          <pre style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
            {JSON.stringify(visit.detection_info, null, 2)}
          </pre>
        ) : null}
      </div>

      {/* Re-run detection (preview) */}
      <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Re-run Detection (Preview, 24h)</h2>
          <button onClick={runPreview} disabled={previewLoading} style={{ padding: '0.5rem 0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {previewLoading ? 'Running…' : 'Run Preview'}
          </button>
        </div>
        {previewError && (
          <div style={{ marginTop: 8, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>
            {previewError}
          </div>
        )}
        {preview && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Account</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Entry</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Exit</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Duration</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Confidence</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Events</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8 }}>{row.account_id}</td>
                    <td style={{ padding: 8 }}>{formatDateTime(row.entry_time)}</td>
                    <td style={{ padding: 8 }}>{formatDateTime(row.exit_time)}</td>
                    <td style={{ padding: 8 }}>{formatDuration(Math.round(((new Date(row.exit_time).getTime() - new Date(row.entry_time).getTime())/60000)))}</td>
                    <td style={{ padding: 8 }}>{Number(row.confidence).toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{row.event_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Re-run and apply */}
      <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Re-run and Apply (Admin)</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Start
            <input type="datetime-local" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
          <label style={{ fontSize: 12, color: '#6b7280' }}>End
            <input type="datetime-local" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
          <button onClick={runApply} disabled={applyLoading} style={{ padding: '0.5rem 0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {applyLoading ? 'Applying…' : 'Re-run & Apply'}
          </button>
        </div>
        {applyError && <div style={{ marginTop: 8, color: '#991b1b' }}>{applyError}</div>}
        {applyMsg && <div style={{ marginTop: 8, color: '#065f46' }}>{applyMsg}</div>}
      </div>

      {/* Contributing events */}
      <div style={{ background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Contributing Location Events ({events.length})</h2>
          {stats && (
            <div style={{ color: '#6b7280', fontSize: 12 }}>
              First: {formatDateTime(stats.firstAt)} • Last: {formatDateTime(stats.lastAt)} • Avg acc: {stats.avgAccuracy.toFixed(1)} m
            </div>
          )}
        </div>
        {events.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>No events linked to this visit.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Timestamp</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Lat</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Lng</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Accuracy (m)</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8 }}>{formatDateTime(e.timestamp)}</td>
                    <td style={{ padding: 8 }}>{e.latitude.toFixed(6)}</td>
                    <td style={{ padding: 8 }}>{e.longitude.toFixed(6)}</td>
                    <td style={{ padding: 8 }}>{Number(e.accuracy).toFixed(0)}</td>
                    <td style={{ padding: 8 }}>{e.event_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default VisitInspector
