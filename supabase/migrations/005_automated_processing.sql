-- Enable pg_cron extension for automated processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule location event processing to run every 5 minutes
-- This will automatically process unprocessed location events into visits
SELECT cron.schedule(
    'process-location-events-to-visits',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT process_location_events_for_visits();'
);

-- Create a function to get the status of our scheduled jobs
CREATE OR REPLACE FUNCTION get_processing_job_status()
RETURNS TABLE (
    job_name text,
    schedule text,
    command text,
    active boolean,
    last_run timestamp with time zone,
    next_run timestamp with time zone,
    run_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname,
        cj.schedule,
        cj.command,
        cj.active,
        cj.last_run,
        cj.next_run,
        COALESCE(count_runs.run_count, 0)
    FROM cron.job cj
    LEFT JOIN (
        SELECT 
            jobid,
            COUNT(*) as run_count
        FROM cron.job_run_details
        GROUP BY jobid
    ) count_runs ON cj.jobid = count_runs.jobid
    WHERE cj.jobname = 'process-location-events-to-visits';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually trigger processing (for testing/debugging)
CREATE OR REPLACE FUNCTION trigger_location_processing()
RETURNS jsonb AS $$
DECLARE
    result_count INTEGER;
    unprocessed_count INTEGER;
BEGIN
    -- Get count of unprocessed events before processing
    SELECT COUNT(*) INTO unprocessed_count 
    FROM location_events 
    WHERE processed = false;
    
    -- Run the processing
    SELECT process_location_events_for_visits() INTO result_count;
    
    -- Return summary
    RETURN jsonb_build_object(
        'unprocessed_events_before', unprocessed_count,
        'visits_created', result_count,
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for the cron job to execute
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT EXECUTE ON FUNCTION process_location_events_for_visits() TO postgres;

-- Add helpful comments
COMMENT ON FUNCTION get_processing_job_status() IS 
'Returns the status and statistics of the automated location processing job';

COMMENT ON FUNCTION trigger_location_processing() IS 
'Manually triggers location event processing and returns summary statistics';

-- Log that automation has been set up
DO $$
BEGIN
    RAISE NOTICE 'Automated location processing set up successfully:';
    RAISE NOTICE '- Running every 5 minutes via pg_cron';
    RAISE NOTICE '- Use get_processing_job_status() to monitor';
    RAISE NOTICE '- Use trigger_location_processing() to test manually';
END;
$$;