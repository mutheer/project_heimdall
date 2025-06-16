/*
  # Fix devices table RLS policies

  1. Changes
    - Drop existing RLS policies for devices table
    - Create new policies that allow proper device management
    - Enable device creation for authenticated users
    
  2. Security
    - Maintain read access for all authenticated users
    - Allow device creation and management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON devices;
DROP POLICY IF EXISTS "Enable device creation" ON devices;
DROP POLICY IF EXISTS "Enable device updates" ON devices;
DROP POLICY IF EXISTS "Enable device deletion" ON devices;

-- Ensure RLS is enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable device creation"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable device updates"
ON devices
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable device deletion"
ON devices
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Enable read access for authenticated users"
ON devices
FOR SELECT
TO authenticated
USING (true);