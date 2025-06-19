/*
  # Fix infinite recursion in users table RLS policies

  1. Changes
    - Drop all existing policies on users table that cause recursion
    - Create new policies that use auth.uid() directly
    - Prevent role escalation by users
    - Use is_admin() function for admin access

  2. Security
    - Users can only view and update their own profile
    - Users cannot change their role (except admins)
    - Admins have full access to all users
    - New user registration is allowed for authenticated users
*/

-- First, drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins have full access to users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;

-- Create new policies that don't cause recursion
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'viewer'); -- Only allow viewer role for self-updates

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'viewer'); -- New users default to viewer role

-- Admin policy using the existing is_admin() function
CREATE POLICY "Admins have full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());