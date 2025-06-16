/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies using correct email check syntax
    - Enable RLS on external_systems table
    
  2. Security
    - Allow all authenticated users to view systems
    - Only allow admins to create and manage systems
    - Use admins table for permission checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can create external systems" ON external_systems;
DROP POLICY IF EXISTS "Authenticated users can view external systems" ON external_systems;
DROP POLICY IF EXISTS "Admins can manage external systems" ON external_systems;

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Authenticated users can view external systems"
ON external_systems
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create external systems"
ON external_systems
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
  )
);

CREATE POLICY "Admins can manage external systems"
ON external_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
  )
);