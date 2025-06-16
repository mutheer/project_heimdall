/*
  # Update External Systems RLS policies to use admins table
  
  1. Changes
    - Drop existing policies
    - Create new policies that check against admins table
    - Maintain read access for all authenticated users
    
  2. Security
    - Only admins can create and manage external systems
    - All authenticated users can view systems
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
    WHERE admins.email = (current_setting('request.jwt.claims', true)::json->>'email')
  )
);

CREATE POLICY "Admins can manage external systems"
ON external_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = (current_setting('request.jwt.claims', true)::json->>'email')
  )
);