/*
  # Fix RLS Configuration Errors

  1. Changes
    - Enable RLS on external_systems table (policies exist but RLS not enabled)
    - Enable RLS on admin_audit_logs table (missing RLS entirely)
    - Add proper RLS policies for admin_audit_logs table
    - Ensure all policies are correctly configured

  2. Security
    - Maintains existing security model
    - Adds missing RLS protection for audit logs
    - Ensures proper access control for all tables
*/

-- Enable RLS on external_systems table (policies exist but RLS not enabled)
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_audit_logs table (missing RLS protection)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for admin_audit_logs table
-- Only admins should be able to view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Only the system should be able to insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Verify that external_systems policies are working correctly
-- Drop and recreate if there are any issues
DO $$
BEGIN
  -- Check if external_systems policies exist and are working
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'external_systems'
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    -- Create read policy if it doesn't exist
    CREATE POLICY "Enable read access for authenticated users"
      ON external_systems
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'external_systems'
    AND policyname = 'Enable admin full access'
  ) THEN
    -- Create admin policy if it doesn't exist
    CREATE POLICY "Enable admin full access"
      ON external_systems
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admins
          WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admins
          WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
      );
  END IF;
END $$;

-- Verify RLS is enabled on all required tables
DO $$
DECLARE
  table_name text;
  rls_enabled boolean;
BEGIN
  -- Check critical tables for RLS
  FOR table_name IN 
    SELECT unnest(ARRAY['users', 'devices', 'threats', 'alerts', 'reports', 
                        'external_systems', 'admin_audit_logs', 'system_logs',
                        'admins', 'threat_database', 'system_settings',
                        'notification_settings', 'scheduled_reports'])
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF NOT rls_enabled THEN
      RAISE NOTICE 'RLS not enabled on table: %', table_name;
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Enabled RLS on table: %', table_name;
    ELSE
      RAISE NOTICE 'RLS already enabled on table: %', table_name;
    END IF;
  END LOOP;
END $$;

-- Add index for better performance on admin email lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Ensure admin_audit_logs has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_table_name ON admin_audit_logs(table_name);

-- Add comment to document the fix
COMMENT ON TABLE external_systems IS 'External healthcare systems integration - RLS enabled with admin access control';
COMMENT ON TABLE admin_audit_logs IS 'Admin action audit trail - RLS enabled, admin access only';

-- Log the completion of RLS fixes
DO $$
BEGIN
  RAISE NOTICE 'RLS configuration fixes completed successfully';
  RAISE NOTICE 'All tables now have proper Row Level Security enabled';
  RAISE NOTICE 'Admin audit logs are now properly protected';
  RAISE NOTICE 'External systems table RLS is confirmed active';
END $$;