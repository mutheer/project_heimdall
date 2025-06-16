/*
  # Update users table RLS policies

  1. Changes
    - Update RLS policies for the users table to allow proper user management
    - Add policy for admins to insert new users
    - Modify select policy to allow admins to view all users
    - Add policy for admins to delete users

  2. Security
    - Ensure only admins can manage users
    - Maintain existing policy for users to view their own profile
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can do everything" ON users;

-- Create new policies with proper permissions
CREATE POLICY "Admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND
  role = 'viewer'
);