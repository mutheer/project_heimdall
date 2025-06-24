/*
  # Revert External Systems Policies

  This migration reverts the external_systems table policies back to their original state
  from this morning, restoring the previous functionality.

  ## Changes
  1. Remove current external systems policies
  2. Restore original external systems policies
  3. Maintain RLS security
*/

-- Drop current external systems policies
DROP POLICY IF EXISTS "Admin full access to external systems" ON external_systems;
DROP POLICY IF EXISTS "Read access for authenticated users" ON external_systems;

-- Restore original external systems policies
CREATE POLICY "Admin full access to external systems"
  ON external_systems
  FOR ALL
  TO authenticated
  USING (( SELECT is_admin() AS is_admin))
  WITH CHECK (( SELECT is_admin() AS is_admin));

CREATE POLICY "Read access for authenticated users"
  ON external_systems
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Log the reversion
DO $$
BEGIN
  RAISE NOTICE 'External systems policies reverted to original state';
  RAISE NOTICE 'Policies restored:';
  RAISE NOTICE '  - Admin full access to external systems (using is_admin())';
  RAISE NOTICE '  - Read access for authenticated users';
END $$;