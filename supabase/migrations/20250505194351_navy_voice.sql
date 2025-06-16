/*
  # Admin Privileges Setup

  1. Changes
    - Add admin role to users table for the admin user
    - Update RLS policies to grant full access to admin users
    - Add admin-specific functions and triggers

  2. Security
    - Enable RLS for all tables
    - Add admin-specific policies
    - Set up audit logging for admin actions
*/

-- Set admin role for the admin user
INSERT INTO users (id, email, role, username)
SELECT 
  auth.uid(),
  'lorrittagaogane@gmail.com',
  'admin',
  'Admin User'
FROM auth.users
WHERE email = 'lorrittagaogane@gmail.com'
ON CONFLICT (email) DO UPDATE
SET role = 'admin';

-- Update admin verification function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN auth.users au ON u.id = au.id
    WHERE au.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND u.role = 'admin'
  );
$$;

-- Add admin-specific policies to all tables
CREATE POLICY "Admins have full access"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access"
  ON devices
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access"
  ON alerts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access"
  ON threats
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access"
  ON reports
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins have full access"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create admin audit logging function
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