/*
  # Update RLS policies for users table

  1. Changes
    - Drop existing policies to avoid conflicts
    - Update is_admin function to use admins table
    - Create new RLS policies for users table with proper permissions
  
  2. Security
    - Enable RLS on users table
    - Add policies for admin access and user management
*/

-- First, drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins have full access to users') THEN
    DROP POLICY "Admins have full access to users" ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Authenticated users can insert users') THEN
    DROP POLICY "Authenticated users can insert users" ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Authenticated users can view all users') THEN
    DROP POLICY "Authenticated users can view all users" ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') THEN
    DROP POLICY "Users can update own profile" ON users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view own profile') THEN
    DROP POLICY "Users can view own profile" ON users;
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

CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;