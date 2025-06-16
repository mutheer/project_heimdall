/*
  # Fix devices table RLS policies

  1. Changes
    - Update RLS policies for devices table to allow proper device management
    - Allow admins to perform all operations on devices
    - Maintain read access for all authenticated users
    - Add policy for analysts to manage devices

  2. Security
    - Enable RLS on devices table
    - Add policies for admin and analyst roles
    - Maintain existing read policy for all authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;

-- Create new policies
CREATE POLICY "Admins can manage devices"
ON devices
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

CREATE POLICY "Analysts can manage devices"
ON devices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'analyst'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'analyst'
  )
);

CREATE POLICY "All authenticated users can view devices"
ON devices
FOR SELECT
TO authenticated
USING (true);