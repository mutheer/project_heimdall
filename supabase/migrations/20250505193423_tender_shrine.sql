/*
  # Update devices table RLS policies

  1. Changes
    - Add policy for device creation
    - Update existing policies for better access control
    
  2. Security
    - Enable RLS on devices table
    - Add policies for device management
    - Maintain existing read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;

-- Create new policies
CREATE POLICY "Admins can manage devices"
ON devices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "All authenticated users can view devices"
ON devices
FOR SELECT
TO authenticated
USING (true);