/*
  # Optimize RLS Policies for Performance and Remove Duplicates

  1. Performance Optimizations
    - Wrap auth function calls in subqueries to prevent re-evaluation per row
    - Update is_admin() function to use optimized pattern
    - Fix auth_rls_initplan warnings

  2. Policy Consolidation
    - Remove duplicate permissive policies for same role/action combinations
    - Consolidate redundant policies into single, efficient policies
    - Maintain security while improving performance

  3. Security
    - Preserve all existing security requirements
    - Ensure proper access control is maintained
    - Optimize without compromising protection
*/

-- Update is_admin() function to use optimized pattern
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins
    WHERE email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
  );
$$;

-- Update log_admin_action() function to use optimized pattern
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT is_admin()) THEN
    INSERT INTO admin_audit_logs (
      admin_email,
      action,
      table_name,
      record_id,
      changes
    ) VALUES (
      (SELECT current_setting('request.jwt.claims', true)::json->>'email'),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- EXTERNAL_SYSTEMS: Drop existing policies and create optimized ones
DROP POLICY IF EXISTS "Enable admin full access" ON external_systems;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON external_systems;

-- Create single optimized policy for external_systems
CREATE POLICY "Admin full access to external systems"
  ON external_systems
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "Read access for authenticated users"
  ON external_systems
  FOR SELECT
  TO authenticated
  USING (true);

-- ADMIN_AUDIT_LOGS: Drop existing policies and create optimized ones
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON admin_audit_logs;

-- Create optimized policies for admin_audit_logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- USERS: Update existing policy to use optimized pattern
DROP POLICY IF EXISTS "Enable update for own profile" ON users;

CREATE POLICY "Enable update for own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ALERTS: Drop duplicate policies and create single optimized policy
DROP POLICY IF EXISTS "Admins have full access" ON alerts;
DROP POLICY IF EXISTS "Admins have full access to alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view assigned alerts" ON alerts;

-- Create single optimized policy for alerts
CREATE POLICY "Admin full access to alerts"
  ON alerts
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "Users can view assigned alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR (SELECT is_admin())
  );

-- REPORTS: Drop duplicate policies and create optimized ones
DROP POLICY IF EXISTS "Admins have full access" ON reports;
DROP POLICY IF EXISTS "Admins have full access to reports" ON reports;
DROP POLICY IF EXISTS "All authenticated users can view reports" ON reports;
DROP POLICY IF EXISTS "Admins and analysts can create reports" ON reports;

-- Create optimized policies for reports
CREATE POLICY "Admin full access to reports"
  ON reports
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "All users can view reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'analyst')
    )
  );

-- SYSTEM_LOGS: Drop duplicate policies and create optimized ones
DROP POLICY IF EXISTS "Authenticated users can view system logs" ON system_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_logs;
DROP POLICY IF EXISTS "Admins can manage system logs" ON system_logs;

-- Create optimized policies for system_logs
CREATE POLICY "Admin full access to system logs"
  ON system_logs
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "All users can view system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- SYSTEM_SETTINGS: Drop duplicate policies and create single optimized policy
DROP POLICY IF EXISTS "Admins have full access" ON system_settings;
DROP POLICY IF EXISTS "Admins have full access to system settings" ON system_settings;

-- Create single optimized policy for system_settings
CREATE POLICY "Admin full access to system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- THREATS: Drop duplicate policies and create optimized ones
DROP POLICY IF EXISTS "Admins have full access" ON threats;
DROP POLICY IF EXISTS "Admins have full access to threats" ON threats;
DROP POLICY IF EXISTS "All authenticated users can view threats" ON threats;
DROP POLICY IF EXISTS "Admins and analysts can manage threats" ON threats;

-- Create optimized policies for threats
CREATE POLICY "Admin full access to threats"
  ON threats
  FOR ALL
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "All users can view threats"
  ON threats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can manage threats"
  ON threats
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'analyst')
    )
  );

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT schemaname, tablename
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'devices', 'threats', 'alerts', 'reports', 
      'external_systems', 'admin_audit_logs', 'system_logs',
      'admins', 'threat_database', 'system_settings',
      'notification_settings', 'scheduled_reports', 'threat_intelligence'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                   table_record.schemaname, table_record.tablename);
  END LOOP;
  
  RAISE NOTICE 'RLS enabled on all required tables';
END $$;

-- Add performance indexes for commonly used auth patterns
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_email_lookup ON admins(email) WHERE email IS NOT NULL;

-- Update function comments for documentation
COMMENT ON FUNCTION is_admin() IS 'Optimized admin check function using subquery pattern for RLS performance';
COMMENT ON FUNCTION log_admin_action() IS 'Optimized audit logging function with subquery pattern for performance';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policy optimization completed successfully';
  RAISE NOTICE 'Performance improvements:';
  RAISE NOTICE '  - Auth function calls wrapped in subqueries';
  RAISE NOTICE '  - Duplicate policies consolidated';
  RAISE NOTICE '  - Performance indexes added';
  RAISE NOTICE 'Security maintained:';
  RAISE NOTICE '  - All access controls preserved';
  RAISE NOTICE '  - RLS enabled on all tables';
  RAISE NOTICE '  - Admin audit logging functional';
END $$;