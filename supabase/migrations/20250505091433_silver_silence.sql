/*
  # Fix RLS policies to prevent recursion

  1. Changes
    - Update users table policies to prevent recursion
    - Simplify admin access checks
    - Add missing policies for threat_database
*/

-- Drop existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new, simplified policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.id != users.id -- Prevent recursion by excluding self-reference
    )
  );

-- Add missing policies for threat_database
CREATE POLICY "Authenticated users can view threat database"
  ON threat_database FOR SELECT
  TO authenticated
  USING (true);