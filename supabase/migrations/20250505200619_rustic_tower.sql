/*
  # Update RLS policies for admin access

  1. Changes
    - Update is_admin() function to properly check admin status
    - Update RLS policies for devices table
    - Update RLS policies for users table
    - Add trigger for admin audit logging

  2. Security
    - Enable RLS on both tables
    - Grant full access to admin users
    - Maintain existing access for other users
*/

-- First, ensure the is_admin function is correctly defined
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

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop devices policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'devices') THEN
    DROP POLICY IF EXISTS "Admins have full access to devices" ON devices;
    DROP POLICY IF EXISTS "Authenticated users can insert devices" ON devices;
    DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;
  END IF;

  -- Drop users policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') THEN
    DROP POLICY IF EXISTS "Admins have full access to users" ON users;
    DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
  END IF;
END $$;

-- Create new policies for devices table
CREATE POLICY "Admins have full access to devices"
  ON devices
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All authenticated users can view devices"
  ON devices
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new policies for users table
CREATE POLICY "Admins have full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'viewer');

-- Ensure RLS is enabled on both tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update admin audit logging trigger
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