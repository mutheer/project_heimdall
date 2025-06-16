/*
  # Add role column to admins table

  1. Changes
    - Add role column to admins table
    - Set default role as 'admin'
    - Update existing admin user with admin role
    - Add constraint to ensure role is always 'admin'

  2. Security
    - Maintain existing RLS policies
*/

-- Add role column to admins table
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- Add constraint to ensure role is always 'admin'
ALTER TABLE admins
ADD CONSTRAINT admins_role_check
CHECK (role = 'admin');

-- Update existing admin user
UPDATE admins
SET role = 'admin'
WHERE email = 'lorrittagaogane@gmail.com';

-- Create or replace the is_admin function to use the admins table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role = 'admin'
  );
$$;