/*
  # Fix external systems access policy
  
  1. Changes
    - Drop existing policies
    - Create simplified policy for admin access
    - Add logging for debugging
    
  2. Security
    - Maintain RLS protection
    - Allow admin access based on email
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON external_systems;
DROP POLICY IF EXISTS "Enable admin access" ON external_systems;

-- Enable RLS
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;

-- Create new simplified policy
CREATE POLICY "Enable admin access"
ON external_systems
FOR ALL
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::json->>'email') = 'lorrittagaogane@gmail.com'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'email') = 'lorrittagaogane@gmail.com'
);

-- Add a function to log JWT claims for debugging
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
      'jwt_claims', current_setting('request.jwt.claims', true)::json
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to log attempts
CREATE TRIGGER log_external_systems_access
  BEFORE INSERT OR UPDATE OR DELETE
  ON external_systems
  FOR EACH ROW
  EXECUTE FUNCTION log_jwt_claims();