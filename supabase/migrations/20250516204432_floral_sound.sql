/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for external systems
    - Add policy for admin access using admins table
    
  2. Security
    - Maintain read access for all authenticated users
    - Restrict write operations to admin users only
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can create external systems" ON external_systems;
DROP POLICY IF EXISTS "Authenticated users can view external systems" ON external_systems;
DROP POLICY IF EXISTS "Admins can manage external systems" ON external_systems;

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
ON external_systems
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable admin access"
ON external_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = current_setting('request.jwt.claims', true)::json->>'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = current_setting('request.jwt.claims', true)::json->>'email'
  )
);