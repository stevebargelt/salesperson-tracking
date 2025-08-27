# Supabase Setup Guide

## Prerequisites
- You have a Supabase account
- You have created a new Supabase project

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiIs...`)
   - **Service Role Key** (starts with `eyJhbGciOiJIUzI1NiIs...`, but different from anon key)

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
   
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

## Step 3: Run Database Migrations

You have two options for running the migrations:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration files in order:

   **Migration 1: Initial Schema**
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Click "Run" to execute

   **Migration 2: Row Level Security**
   - Copy and paste the contents of `supabase/migrations/002_row_level_security.sql`
   - Click "Run" to execute

   **Migration 3: Spatial Functions**
   - Copy and paste the contents of `supabase/migrations/003_spatial_functions.sql`
   - Click "Run" to execute

   **Migration 4: Analytics Functions**
   - Copy and paste the contents of `supabase/migrations/004_analytics_functions.sql`
   - Click "Run" to execute

   **Migration 5: Automated Processing** ⭐ **NEW**
   - Copy and paste the contents of `supabase/migrations/005_automated_processing.sql`
   - Click "Run" to execute
   - This sets up automatic location event processing every 5 minutes

### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login and link your project:
   ```bash
   supabase login
   supabase init
   supabase link --project-ref your-project-ref
   ```

3. Push migrations:
   ```bash
   supabase db push
   ```

## Step 4: Monitor Automated Processing

After running Migration 5, you can monitor the automated processing:

### Check Processing Job Status
```sql
-- Check if the automated job is running
SELECT * FROM get_processing_job_status();
```

### Manual Processing (for testing)
```sql
-- Manually trigger processing and see results
SELECT * FROM trigger_location_processing();
```

### Monitor Unprocessed Events
```sql
-- Check how many events are waiting to be processed
SELECT COUNT(*) FROM location_events WHERE processed = false;
```

### View Recent Processing Activity
```sql
-- See recently created visits (evidence of successful processing)
SELECT 
    v.created_at,
    p.full_name,
    a.account_name,
    v.check_in_time,
    v.check_out_time,
    v.duration_minutes
FROM visits v
JOIN profiles p ON v.user_id = p.id
JOIN accounts a ON v.account_id = a.id
WHERE v.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY v.created_at DESC;
```

## Step 5: Enable PostGIS Extension

1. In the Supabase dashboard, go to **Database** → **Extensions**
2. Search for "postgis" and enable it
3. This should already be handled by the migration, but verify it's enabled

## Step 5: Set Up Sample Data (Optional)

1. In the SQL Editor, run the initialization script:
   ```sql
   -- Copy and paste contents of scripts/init-supabase.sql
   ```

2. This will create sample accounts and helper functions for testing

## Step 6: Create Your First Admin User

1. **Sign up through your app** (once you build the auth flow) OR
2. **Create user via Supabase dashboard**:
   - Go to **Authentication** → **Users**
   - Click "Add user"
   - Enter email and password
   - Copy the user UUID

3. **Set the user as admin**:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = 'your-user-uuid-here';
   ```

## Step 7: Test the Setup

Run these queries in the SQL Editor to verify everything works:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check PostGIS is working
SELECT PostGIS_Version();

-- Test spatial function
SELECT * FROM accounts_near_location(37.4220, -122.0841, 5.0);

-- Check sample accounts
SELECT account_name, city, state FROM accounts LIMIT 5;
```

## Step 8: Update Database Types (Optional)

If you want to generate actual TypeScript types from your database:

1. Install Supabase CLI (if not already done)
2. Generate types:
   ```bash
   supabase gen types typescript --project-id your-project-ref > libs/shared/supabase/src/lib/database.types.ts
   ```

## Development vs Production

### Local Development
- Use the included `supabase/config.toml` for local development
- Run `supabase start` to start local Supabase stack
- Use local URLs: `http://127.0.0.1:54321`

### Production
- Use your actual Supabase project URLs
- Enable RLS (Row Level Security) - already handled by migrations
- Set up proper CORS origins in Supabase dashboard

## Security Checklist

- [ ] RLS enabled on all tables ✅ (handled by migrations)
- [ ] Proper authentication policies ✅ (handled by migrations)
- [ ] Environment variables secured (not committed to git)
- [ ] Service role key only used server-side
- [ ] CORS properly configured for your domains

## Troubleshooting

### Common Issues

1. **"relation does not exist" error**
   - Make sure migrations ran successfully
   - Check that you're connected to the right database

2. **"permission denied" error**
   - Check RLS policies are correctly applied
   - Verify user authentication

3. **PostGIS functions not working**
   - Ensure PostGIS extension is enabled
   - Check that spatial indexes were created

4. **Environment variables not loading**
   - Verify `.env` file is in the root directory
   - Check variable names match exactly

### Getting Help

1. Check Supabase documentation: https://supabase.com/docs
2. Review migration files for any SQL errors
3. Check the Supabase dashboard logs for error details

## Next Steps

Once Supabase is set up:

1. **Test the admin dashboard** - Build and run the admin web app
2. **Test the mobile app** - Build and run the iOS app
3. **Create sample users** - Add salesperson accounts
4. **Assign accounts** - Use the `assign_random_accounts_to_user()` function
5. **Generate test data** - Use `generate_sample_location_events()` for testing

Your database is now ready for the salesperson tracking system! 🎉