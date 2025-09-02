import { supabase } from './supabase';

/**
 * Admin functions for monitoring and managing backend processing
 */
export const adminFunctions = {
  /**
   * Get the status of the automated location processing job
   */
  async getProcessingJobStatus() {
    return await supabase.rpc('get_processing_job_status');
  },

  /**
   * Manually trigger location event processing
   * Returns summary of what was processed
   */
  async triggerLocationProcessing() {
    return await supabase.rpc('trigger_location_processing');
  },

  /**
   * Get count of unprocessed location events
   */
  async getUnprocessedEventCount() {
    const { data, error } = await supabase
      .from('location_events')
      .select('id', { count: 'exact' })
      .eq('processed', false);

    return { data: data?.length || 0, error };
  },

  /**
   * Get recent processing activity
   */
  async getRecentProcessingActivity(limitHours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - limitHours);

    // Get recently created visits (indicates successful processing)
    const { data, error } = await supabase
      .from('visits')
      .select(`
        id,
        user_id,
        account_id,
        check_in_time,
        check_out_time,
        duration_minutes,
        created_at,
        account:accounts(account_name),
        user:profiles(full_name)
      `)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    return { data, error };
  },

  /**
   * Get system health metrics for processing
   */
  async getProcessingHealthMetrics() {
    try {
      const since24h = new Date();
      since24h.setHours(since24h.getHours() - 24);

      const [unprocessedResult, recentVisitsResult, jobStatusResult, anomaliesResult] = await Promise.all([
        this.getUnprocessedEventCount(),
        this.getRecentProcessingActivity(1), // Last hour
        this.getProcessingJobStatus(),
        (async () => {
          // Anomalies in last 24h
          const { data, error } = await supabase
            .from('visits')
            .select('id, duration_minutes, detection_confidence, detection_event_count, created_at')
            .gte('created_at', since24h.toISOString());
          if (error) return { error } as any;
          const rows = data || [];
          const longVisits = rows.filter((r: any) => (r.duration_minutes ?? 0) > 480).length; // > 8h
          const lowConfidence = rows.filter((r: any) => r.detection_confidence != null && Number(r.detection_confidence) < 0.5).length;
          const lowEvents = rows.filter((r: any) => r.detection_event_count != null && Number(r.detection_event_count) < 2).length;
          return { data: { longVisits, lowConfidence, lowEvents } } as any;
        })()
      ]);

      return {
        unprocessedEvents: unprocessedResult.data,
        recentVisitsCount: recentVisitsResult.data?.length || 0,
        jobStatus: jobStatusResult.data?.[0] || null,
        lastChecked: new Date().toISOString(),
        anomalies: anomaliesResult.data || null,
        error: unprocessedResult.error || recentVisitsResult.error || jobStatusResult.error
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }
};
