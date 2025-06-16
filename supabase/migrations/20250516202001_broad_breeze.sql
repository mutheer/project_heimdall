/*
  # Fix External Systems RLS Policies

  1. Changes
    - Drop existing INSERT policy that's not working correctly
    - Create new INSERT policy that properly checks for admin role
    - Ensure consistent policy naming and checks with other tables

  2. Security
    - Only admins can create new external systems
    - All authenticated users can still view external systems
    - Maintains existing management policies for admins
*/

-- Drop the existing INSERT policy that's not working
DROP POLICY IF EXISTS "Enable system creation for authenticated users" ON external_systems;

-- Create new INSERT policy that properly checks for admin role
CREATE POLICY "Only admins can create external systems"
ON external_systems
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);