/*
  # Add device creation policy

  1. Changes
    - Add RLS policy to allow authenticated users to insert new devices
    - Add RLS policy to allow admins and analysts to insert new devices

  2. Security
    - Enable RLS on devices table (if not already enabled)
    - Add policy for device creation by authenticated users with admin or analyst roles
    - Add policy for device creation by any authenticated user (with restrictions)
*/

-- First ensure RLS is enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Add policy for device creation by admins and analysts
CREATE POLICY "Admins and analysts can create devices"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'analyst')
  )
);

-- Add policy for device creation by any authenticated user
CREATE POLICY "Authenticated users can create devices"
ON devices
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);