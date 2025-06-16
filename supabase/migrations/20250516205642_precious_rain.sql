/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for external systems
    - Add policy for admin access using verify_admin function
    
  2. Security
    - Maintain RLS protection
    - Allow admin access based on admin verification
    - Keep read access for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin full access" ON external_systems;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON external_systems;

-- Create new policies
CREATE POLICY "Enable admin full access"
ON external_systems
FOR ALL
TO authenticated
USING (
  verify_admin(
    current_setting('request.jwt.claims', true)::json->>'email',
    'admin'
  )
)
WITH CHECK (
  verify_admin(
    current_setting('request.jwt.claims', true)::json->>'email',
    'admin'
  )
);

CREATE POLICY "Enable read access for authenticated users"
ON external_systems
FOR SELECT
TO authenticated
USING (true);