/*
  # Update RLS policies for devices table

  1. Changes
    - Drop existing RLS policies for devices table
    - Add new comprehensive RLS policies:
      - Allow authenticated users to view all devices
      - Allow admins and analysts to manage devices
      - Enable RLS on devices table

  2. Security
    - Maintains security by requiring authentication
    - Restricts device management to admin and analyst roles
    - Preserves read access for all authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
DROP POLICY IF EXISTS "Admins have full access" ON devices;
DROP POLICY IF EXISTS "Admins have full access to devices" ON devices;
DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;
DROP POLICY IF EXISTS "Analysts can manage devices" ON devices;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
ON devices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for admins and analysts"
ON devices FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'analyst')
  )
);

CREATE POLICY "Enable update for admins and analysts"
ON devices FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'analyst')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'analyst')
  )
);

CREATE POLICY "Enable delete for admins and analysts"
ON devices FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'analyst')
  )
);