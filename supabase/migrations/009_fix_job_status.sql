-- Replace get_processing_job_status() to work with pg_cron versions
-- where cron.job does not expose last_run/next_run columns.

CREATE OR REPLACE FUNCTION get_processing_job_status()
RETURNS TABLE (
    job_name text,
    schedule text,
    command text,
    active boolean,
    last_run timestamptz,
    next_run timestamptz,
    run_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname::text AS job_name,
        cj.schedule::text AS schedule,
        cj.command::text AS command,
        cj.active AS active,
        jr.last_run,
        NULL::timestamptz AS next_run, -- Not available across all pg_cron versions
        COALESCE(cr.run_count, 0) AS run_count
    FROM cron.job cj
    LEFT JOIN LATERAL (
        SELECT MAX(start_time) AS last_run
        FROM cron.job_run_details jrd
        WHERE jrd.jobid = cj.jobid
    ) jr ON true
    LEFT JOIN (
        SELECT jobid, COUNT(*)::bigint AS run_count
        FROM cron.job_run_details
        GROUP BY jobid
    ) cr ON cr.jobid = cj.jobid
    WHERE cj.jobname = 'process-location-events-to-visits';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

