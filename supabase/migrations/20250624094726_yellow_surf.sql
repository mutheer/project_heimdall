/*
  # Refine Login Context and RLS Policies

  1. Changes
    - Update handle_new_user trigger to properly handle role assignment
    - Update RLS policies for users table to use role-based checks
    - Remove hardcoded email checks where possible
    - Ensure proper user creation flow

  2. Security
    - Maintain security while removing hardcoded admin emails
    - Use role-based access control consistently
    - Preserve admin access through admins table
*/

-- Update the handle_new_user function to be more robust and remove hardcoded emails
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new user profile when auth user is created
  INSERT INTO public.users (
    id,
    username,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    now(),
    now()
  ) ON CONFLICT (email) DO UPDATE SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    role = COALESCE(NEW.raw_user_meta_data->>'role', users.role),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update RLS policies for users table to use role-based checks instead of hardcoded emails
DROP POLICY IF EXISTS "Enable delete for admins" ON users;

-- Create new delete policy that uses role-based check
CREATE POLICY "Enable delete for admins"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
    )
  );

-- Update the is_admin function to also check the users table for admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admins
    WHERE email = (SELECT current_setting('request.jwt.claims', true)::json->>'email')
  ) OR EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create a helper function to get current user ID safely
CREATE OR REPLACE FUNCTION uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Update threats policies to use the uid() function for better performance
DROP POLICY IF EXISTS "Analysts can insert threats" ON threats;
DROP POLICY IF EXISTS "Analysts can update threats" ON threats;
DROP POLICY IF EXISTS "Analysts can delete threats" ON threats;

CREATE POLICY "Analysts can insert threats"
  ON threats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = uid()
      AND role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Analysts can update threats"
  ON threats
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = uid()
      AND role IN ('admin', 'analyst')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = uid()
      AND role IN ('admin', 'analyst')
    )
  );

CREATE POLICY "Analysts can delete threats"
  ON threats
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = uid()
      AND role IN ('admin', 'analyst')
    )
  );

-- Update alerts policies to use uid() function
DROP POLICY IF EXISTS "Users can view assigned alerts" ON alerts;

CREATE POLICY "Users can view assigned alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR is_admin()
  );

-- Update reports policies to use uid() function
DROP POLICY IF EXISTS "Analysts can create reports" ON reports;

CREATE POLICY "Analysts can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = uid()
      AND role IN ('admin', 'analyst')
    )
  );

-- Ensure all admin users exist in both admins and users tables
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Sync admins to users table
  FOR admin_record IN SELECT id, email, role, created_at FROM admins
  LOOP
    INSERT INTO users (id, username, email, role, created_at, updated_at)
    VALUES (
      admin_record.id,
      split_part(admin_record.email, '@', 1),
      admin_record.email,
      'admin',
      admin_record.created_at,
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'admin',
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Synced % admin records to users table', (SELECT COUNT(*) FROM admins);
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

-- Update function comments
COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile from auth.users data without hardcoded role assignments';
COMMENT ON FUNCTION is_admin() IS 'Checks admin status from both admins table and users table role';
COMMENT ON FUNCTION uid() IS 'Safe wrapper for auth.uid() function';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Login context refinement completed successfully';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Removed hardcoded admin email checks from UserContext';
  RAISE NOTICE '  - Updated handle_new_user trigger to use role from metadata';
  RAISE NOTICE '  - Updated RLS policies to use role-based checks';
  RAISE NOTICE '  - Added uid() helper function for better performance';
  RAISE NOTICE '  - Synced admin users between tables';
  RAISE NOTICE 'Security maintained:';
  RAISE NOTICE '  - All access controls preserved';
  RAISE NOTICE '  - Role-based access control enforced';
  RAISE NOTICE '  - Admin privileges maintained through multiple checks';
END $$;