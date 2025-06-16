/*
  # Update admin authentication system
  
  1. Changes
    - Update is_admin() function to use admins table instead of users
    - Update admin audit logging
    - Clean up and recreate policies for admin access
  
  2. Security
    - Ensures admin access is controlled through dedicated admins table
    - Maintains audit logging for admin actions
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies from devices table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'devices' 
    AND policyname = 'Admins have full access to devices'
  ) THEN
    DROP POLICY "Admins have full access to devices" ON devices;
  END IF;

  -- Drop policies from users table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Admins have full access to users'
  ) THEN
    DROP POLICY "Admins have full access to users" ON users;
  END IF;

  -- Drop policies from alerts table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts' 
    AND policyname = 'Admins have full access to alerts'
  ) THEN
    DROP POLICY "Admins have full access to alerts" ON alerts;
  END IF;

  -- Drop policies from threats table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'threats' 
    AND policyname = 'Admins have full access to threats'
  ) THEN
    DROP POLICY "Admins have full access to threats" ON threats;
  END IF;

  -- Drop policies from reports table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'reports' 
    AND policyname = 'Admins have full access to reports'
  ) THEN
    DROP POLICY "Admins have full access to reports" ON reports;
  END IF;

  -- Drop policies from system_settings table
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_settings' 
    AND policyname = 'Admins have full access to system settings'
  ) THEN
    DROP POLICY "Admins have full access to system settings" ON system_settings;
  END IF;
END $$;

-- Update is_admin function to use admins table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
  );
$$;

-- Update admin audit logging function
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    INSERT INTO admin_audit_logs (
      admin_email,
      action,
      table_name,
      record_id,
      changes
    ) VALUES (
      current_setting('request.jwt.claims', true)::json->>'email',
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

-- Create new RLS policies for all tables
CREATE POLICY "Admins have full access to devices"
  ON devices
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access to alerts"
  ON alerts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access to threats"
  ON threats
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access to reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access to system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());