/*
  # Fix recursion in users table policies

  1. Changes
    - Drop and recreate users table policies to prevent recursion
    - Simplify policy logic by using auth.users for admin checks
    - Add separate policy for admin self-management

  2. Security
    - Maintain existing security model
    - Prevent infinite recursion in policy evaluation
    - Ensure admins can still manage other users
*/

-- Drop existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new policies that avoid recursion
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage other users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = au.id
        AND u.role = 'admin'
        AND u.id != users.id
      )
    )
  );

-- Add policy for admins to manage their own profile
CREATE POLICY "Admins can manage own profile"
  ON users FOR ALL
  TO authenticated
  USING (
    id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );