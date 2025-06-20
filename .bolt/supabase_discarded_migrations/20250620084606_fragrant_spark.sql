/*
  # Create Admin User in Custom Tables Only
  
  1. Changes
    - Create admin user in public.admins table with correct password
    - Create admin user in public.users table with admin role
    - Update verify_admin function to work properly
    - Add admin user with email mudhirabu@gmail.com and password admin123
    
  2. Security
    - Use proper password hashing with bcrypt
    - Ensure admin verification works correctly
    - Set up proper admin permissions
    
  Note: The auth.users table must be managed through Supabase Dashboard or Auth API
*/

-- Ensure pgcrypto extension is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, let's clean up any existing admin records to avoid conflicts
DELETE FROM public.admins WHERE email = 'mudhirabu@gmail.com';
DELETE FROM public.users WHERE email = 'mudhirabu@gmail.com';

-- Create the admin user in public.admins table
DO $$
DECLARE
  admin_user_id uuid;
  hashed_password text;
  admin_email text := 'mudhirabu@gmail.com';
  admin_password text := 'admin123';
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Hash the password using bcrypt
  hashed_password := crypt(admin_password, gen_salt('bf'));
  
  -- Insert into public.admins table
  INSERT INTO public.admins (
    id,
    email,
    password,
    role,
    created_at
  ) VALUES (
    admin_user_id,
    admin_email,
    hashed_password,
    'admin',
    now()
  );
  
  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    username,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'Admin User',
    admin_email,
    'admin',
    now(),
    now()
  );
  
  RAISE NOTICE 'Admin user created successfully with email: %', admin_email;
  RAISE NOTICE 'Admin user ID: %', admin_user_id;
  
END;
$$;

-- Update the verify_admin function to ensure it works correctly
CREATE OR REPLACE FUNCTION verify_admin(
  email_input text,
  password_input text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin exists and password matches
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE email = email_input
    AND password = crypt(password_input, password)
    AND role = 'admin'
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error and return false
  RAISE LOG 'Error in verify_admin: %', SQLERRM;
  RETURN false;
END;
$$;

-- Create a function to handle admin authentication for the frontend
CREATE OR REPLACE FUNCTION authenticate_admin(
  email_input text,
  password_input text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record record;
  user_record record;
BEGIN
  -- Verify admin credentials
  IF NOT verify_admin(email_input, password_input) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credentials'
    );
  END IF;
  
  -- Get admin details
  SELECT * INTO admin_record
  FROM public.admins
  WHERE email = email_input;
  
  -- Get user details
  SELECT * INTO user_record
  FROM public.users
  WHERE email = email_input;
  
  -- Return success with user details
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'username', user_record.username,
      'role', user_record.role
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Authentication failed'
  );
END;
$$;

-- Test the admin authentication
DO $$
DECLARE
  test_result jsonb;
BEGIN
  -- Test the verify_admin function
  IF verify_admin('mudhirabu@gmail.com', 'admin123') THEN
    RAISE NOTICE 'SUCCESS: Admin verification works correctly';
  ELSE
    RAISE WARNING 'FAILED: Admin verification failed';
  END IF;
  
  -- Test the authenticate_admin function
  SELECT authenticate_admin('mudhirabu@gmail.com', 'admin123') INTO test_result;
  
  IF (test_result->>'success')::boolean THEN
    RAISE NOTICE 'SUCCESS: Admin authentication works correctly';
    RAISE NOTICE 'User details: %', test_result->'user';
  ELSE
    RAISE WARNING 'FAILED: Admin authentication failed: %', test_result->>'error';
  END IF;
END;
$$;

-- Verify the admin user was created in both tables
DO $$
DECLARE
  admins_count integer;
  users_count integer;
  admin_email text := 'mudhirabu@gmail.com';
BEGIN
  SELECT COUNT(*) INTO admins_count 
  FROM public.admins 
  WHERE email = admin_email;
  
  SELECT COUNT(*) INTO users_count 
  FROM public.users 
  WHERE email = admin_email AND role = 'admin';
  
  IF admins_count = 1 AND users_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Admin user exists in both admins and users tables';
  ELSE
    RAISE WARNING 'WARNING: Admin user missing from some tables (admins: %, users: %)', admins_count, users_count;
  END IF;
  
  RAISE NOTICE 'Admin setup completed. You can now:';
  RAISE NOTICE '1. Create the auth user manually in Supabase Dashboard';
  RAISE NOTICE '2. Email: mudhirabu@gmail.com';
  RAISE NOTICE '3. Password: admin123';
  RAISE NOTICE '4. Or use the authenticate_admin function for custom auth';
END;
$$;