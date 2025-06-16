/*
  # Add RLS policy for external systems table

  1. Changes
    - Add INSERT policy for external_systems table to allow authenticated users to create new systems
    - Ensure RLS is enabled on the table

  2. Security
    - Only authenticated users can insert new records
    - Maintains existing policies for other operations
*/

-- Enable RLS if not already enabled
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Add policy for inserting new systems
CREATE POLICY "Enable system creation for authenticated users"
ON external_systems
FOR INSERT
TO authenticated
WITH CHECK (true);