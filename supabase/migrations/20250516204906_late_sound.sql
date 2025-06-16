/*
  # Fix external systems RLS policy

  1. Changes
    - Drop existing policies
    - Create new policy that checks admin status correctly
    - Add logging for debugging
    
  2. Security
    - Maintain RLS protection
    - Ensure only admins can manage systems
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin access" ON external_systems;

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new policy with proper admin check
CREATE POLICY "Enable admin access"
ON external_systems
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = (current_setting('request.jwt.claims', true)::json->>'email')
    AND admins.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.email = (current_setting('request.jwt.claims', true)::json->>'email')
    AND admins.role = 'admin'
  )
);

-- Add policy for read access
CREATE POLICY "Enable read access"
ON external_systems
FOR SELECT
TO authenticated
USING (true);

-- Update logging function
CREATE OR REPLACE FUNCTION log_jwt_claims()
RETURNS trigger AS $$
BEGIN
  INSERT INTO admin_audit_logs (
    admin_email,
    action,
    table_name,
    changes
  ) VALUES (
    current_setting('request.jwt.claims', true)::json->>'email',
    TG_OP,
    TG_TABLE_NAME,
    jsonb_build_object(
      'jwt_claims', current_setting('request.jwt.claims', true)::json,
      'operation', TG_OP,
      'new_data', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;