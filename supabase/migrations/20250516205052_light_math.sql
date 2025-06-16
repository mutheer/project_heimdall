/*
  # Update external_systems RLS policies

  1. Changes
    - Drop existing RLS policies for external_systems table
    - Create new, clearer policies for:
      - Admin full access
      - Read access for authenticated users
  
  2. Security
    - Maintains RLS enabled
    - Simplifies admin access check using is_admin() function
    - Preserves read access for all authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin access" ON external_systems;
DROP POLICY IF EXISTS "Enable read access" ON external_systems;

-- Create new policies with clearer conditions
CREATE POLICY "Enable admin full access" 
ON external_systems
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Enable read access for authenticated users" 
ON external_systems
FOR SELECT 
TO authenticated
USING (true);