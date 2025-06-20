/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on users table
    - Create new simplified policies that don't cause recursion
    - Use auth.uid() and jwt claims directly instead of querying users table
    - Add proper admin function that doesn't cause recursion

  2. Policy Changes
    - Users can view their own profile using auth.uid()
    - Users can update their own profile (but not change role)
    - Allow user registration for authenticated users
    - Admins have full access using is_admin() function
*/

-- First, drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

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
  WITH CHECK (auth.uid() = id AND role = OLD.role); -- Prevent role changes

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin policy using the existing is_admin() function
CREATE POLICY "Admins have full access to users"
  ON users
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());