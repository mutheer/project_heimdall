/*
  # Fix external systems RLS policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Add new policies for external systems table
    - Enable proper access for authenticated users
    
  2. Security
    - Enable RLS on external_systems table
    - Add policies for admin access
    - Add policies for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin full access" ON external_systems;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON external_systems;

-- Ensure RLS is enabled
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
ON external_systems
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable admin full access"
ON external_systems
FOR ALL
TO authenticated
USING (
  verify_admin(
    (current_setting('request.jwt.claims', true)::json->>'email'),
    'admin'
  )
)
WITH CHECK (
  verify_admin(
    (current_setting('request.jwt.claims', true)::json->>'email'),
    'admin'
  )
);