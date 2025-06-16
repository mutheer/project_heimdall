/*
  # Update admin privileges and policies

  1. Changes
    - Add admin function to verify admin status
    - Update RLS policies for admin access
    - Add trigger for admin audit logging

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Function to check if user is admin
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

-- Update devices policies
CREATE POLICY "Admins have full access to devices"
  ON devices
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update users policies
CREATE POLICY "Admins have full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update alerts policies
CREATE POLICY "Admins have full access to alerts"
  ON alerts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update reports policies
CREATE POLICY "Admins have full access to reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text REFERENCES admins(email),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF is_admin() THEN
    INSERT INTO admin_audit_logs (admin_email, action, table_name, record_id, changes)
    VALUES (
      current_setting('request.jwt.claims', true)::json->>'email',
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(NEW)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Add audit triggers to relevant tables
CREATE TRIGGER log_device_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON devices
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER log_user_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER log_alert_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action();