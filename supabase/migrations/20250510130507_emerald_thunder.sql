/*
  # Fix RLS policies for devices table

  1. Changes
    - Drop all existing device policies to avoid conflicts
    - Create clear, non-conflicting policies for device management
    - Enable proper access for admins and analysts
    
  2. Security
    - Maintain read access for all authenticated users
    - Restrict write operations to admins and analysts only
*/

-- First, drop all existing policies for devices table
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
DROP POLICY IF EXISTS "Admins have full access" ON devices;
DROP POLICY IF EXISTS "Admins have full access to devices" ON devices;
DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;
DROP POLICY IF EXISTS "Analysts can manage devices" ON devices;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON devices;
DROP POLICY IF EXISTS "Enable insert for admins and analysts" ON devices;
DROP POLICY IF EXISTS "Enable update for admins and analysts" ON devices;
DROP POLICY IF EXISTS "Enable delete for admins and analysts" ON devices;
DROP POLICY IF EXISTS "Admins and analysts can create devices" ON devices;
DROP POLICY IF EXISTS "Authenticated users can create devices" ON devices;

-- Ensure RLS is enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Create new, simplified policies

-- Allow all authenticated users to view devices
CREATE POLICY "Enable read access for authenticated users"
ON devices FOR SELECT
TO authenticated
USING (true);

-- Allow admins and analysts to insert devices
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

-- Allow admins and analysts to update devices
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

-- Allow admins and analysts to delete devices
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