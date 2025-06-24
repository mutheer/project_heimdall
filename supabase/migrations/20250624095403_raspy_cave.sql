/*
  # Fix User Profile Loading Issues

  1. Changes
    - Add better error handling for user profile queries
    - Improve RLS policies to prevent silent failures
    - Add logging for debugging profile loading issues
    - Ensure proper indexes for performance

  2. Security
    - Maintain existing RLS protection
    - Add better error reporting for debugging
    - Ensure users can always read their own profile
*/

-- Create a function to safely get current user email from JWT
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    ''
  );
$$;

-- Update users table policies to be more explicit about access
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create explicit policy for users to read their own profile by ID
CREATE POLICY "Users can read own profile by ID"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create explicit policy for users to read their own profile by email
CREATE POLICY "Users can read own profile by email"
  ON users
  FOR SELECT
  TO authenticated
  USING (email = get_current_user_email());

-- Create policy for admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
  user_name text;
BEGIN
  -- Extract role and username from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
  user_name := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Log the user creation attempt
  RAISE LOG 'Creating user profile for: % with role: %', NEW.email, user_role;
  
  -- Insert new user profile
  INSERT INTO public.users (
    id,
    username,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_role,
    now(),
    now()
  ) ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    role = CASE 
      WHEN users.role = 'admin' THEN users.role  -- Don't downgrade admins
      ELSE EXCLUDED.role 
    END,
    updated_at = now();
  
  RAISE LOG 'User profile created/updated successfully for: %', NEW.email;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the specific error
  RAISE LOG 'Error in handle_new_user for %: % - %', NEW.email, SQLSTATE, SQLERRM;
  
  -- Don't fail the auth user creation, but log the issue
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to debug user profile access
CREATE OR REPLACE FUNCTION debug_user_profile_access(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  user_exists boolean;
  user_data jsonb;
  current_uid uuid;
  current_email text;
  rls_enabled boolean;
BEGIN
  -- Get current user info
  current_uid := auth.uid();
  current_email := get_current_user_email();
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Check if user exists in table
  SELECT EXISTS(SELECT 1 FROM users WHERE email = user_email) INTO user_exists;
  
  -- Try to get user data
  BEGIN
    SELECT to_jsonb(u.*) INTO user_data
    FROM users u
    WHERE u.email = user_email;
  EXCEPTION WHEN OTHERS THEN
    user_data := jsonb_build_object('error', SQLERRM);
  END;
  
  -- Build result
  result := jsonb_build_object(
    'current_uid', current_uid,
    'current_email', current_email,
    'target_email', user_email,
    'rls_enabled', rls_enabled,
    'user_exists', user_exists,
    'user_data', user_data,
    'is_admin', is_admin(),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Add better indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_users_id_email ON users(id, email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- Create a view for safe user profile access (optional, for debugging)
CREATE OR REPLACE VIEW user_profile_debug AS
SELECT 
  id,
  username,
  email,
  role,
  created_at,
  updated_at,
  CASE 
    WHEN id = auth.uid() THEN 'own_profile'
    WHEN is_admin() THEN 'admin_access'
    ELSE 'no_access'
  END as access_reason
FROM users
WHERE id = auth.uid() OR is_admin();

-- Update the is_admin function to be more robust
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM admins
      WHERE email = get_current_user_email()
    ),
    false
  ) OR COALESCE(
    EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    ),
    false
  );
$$;

-- Add a function to check user profile loading health
CREATE OR REPLACE FUNCTION check_user_profile_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  total_users integer;
  users_with_auth integer;
  orphaned_users integer;
  admin_count integer;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM users;
  
  -- Count users with auth records
  SELECT COUNT(*) INTO users_with_auth 
  FROM users u 
  WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);
  
  -- Count orphaned users (users without auth records)
  SELECT COUNT(*) INTO orphaned_users 
  FROM users u 
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);
  
  -- Count admin users
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  
  result := jsonb_build_object(
    'total_users', total_users,
    'users_with_auth', users_with_auth,
    'orphaned_users', orphaned_users,
    'admin_count', admin_count,
    'health_score', CASE 
      WHEN total_users = 0 THEN 0
      ELSE (users_with_auth::float / total_users::float * 100)::integer
    END,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'User profile loading fixes completed successfully';
  RAISE NOTICE 'Improvements made:';
  RAISE NOTICE '  - Enhanced RLS policies for better user profile access';
  RAISE NOTICE '  - Added debugging functions for troubleshooting';
  RAISE NOTICE '  - Improved error handling in user creation trigger';
  RAISE NOTICE '  - Added performance indexes for user lookups';
  RAISE NOTICE '  - Created health check functions';
  RAISE NOTICE 'Debug functions available:';
  RAISE NOTICE '  - debug_user_profile_access(email)';
  RAISE NOTICE '  - check_user_profile_health()';
END $$;