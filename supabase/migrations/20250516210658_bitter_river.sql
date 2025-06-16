/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies
    - Add new policies for admin access
    - Add policy for read access
    
  2. Security
    - Enable RLS on external_systems table
    - Grant full access to admin users
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
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
  )
);

CREATE POLICY "Enable read access for authenticated users"
ON external_systems
FOR SELECT
TO authenticated
USING (true);