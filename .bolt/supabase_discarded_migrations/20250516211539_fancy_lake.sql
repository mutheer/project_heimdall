/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for external systems
    - Add proper admin access checks
    
  2. Security
    - Maintain RLS protection
    - Allow admins full access
    - Allow read access for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin full access" ON external_systems;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON external_systems;

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable admin full access"
ON external_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = current_setting('request.jwt.claims', true)::json->>'email'
    AND admins.role = 'admin'
  )
);

CREATE POLICY "Enable read access for authenticated users"
ON external_systems
FOR SELECT
TO authenticated
USING (true);