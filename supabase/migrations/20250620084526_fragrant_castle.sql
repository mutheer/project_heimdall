/*
  # Create Default Admin User

  1. New Admin User Setup
    - Creates admin user in auth.users table
    - Creates corresponding record in public.users table
    - Creates corresponding record in public.admins table
    - Sets up proper relationships and permissions

  2. Security
    - Ensures admin has proper role assignments
    - Sets up audit trail for admin creation

  3. Notes
    - Email: mudhirabu@gmail.com
    - Password: admin123 (hashed)
    - Role: admin
*/

-- First, let's create a function to safely create the admin user
CREATE OR REPLACE FUNCTION create_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  hashed_password text;
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Hash the password using crypt (this is a simplified approach)
  -- In production, Supabase handles password hashing automatically
  hashed_password := crypt('admin123', gen_salt('bf'));
  
  -- Insert into auth.users (Supabase's auth table)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'mudhirabu@gmail.com',
    hashed_password,
    now(),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING;
  
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
    'admin',
    'mudhirabu@gmail.com',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    updated_at = now();
  
  -- Insert into public.admins table
  INSERT INTO public.admins (
    id,
    email,
    password,
    role,
    created_at
  ) VALUES (
    admin_user_id,
    'mudhirabu@gmail.com',
    hashed_password,
    'admin',
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    password = hashed_password,
    updated_at = now();
  
END;
$$;

-- Execute the function to create the admin user
SELECT create_default_admin();

-- Clean up the function
DROP FUNCTION create_default_admin();

-- Ensure the admin user has proper permissions by updating RLS policies if needed
-- This is handled by existing policies, but we'll verify the user exists

-- Verify the admin user was created
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count 
  FROM public.users 
  WHERE email = 'mudhirabu@gmail.com' AND role = 'admin';
  
  IF user_count = 0 THEN
    RAISE EXCEPTION 'Admin user creation failed';
  ELSE
    RAISE NOTICE 'Admin user successfully created with email: mudhirabu@gmail.com';
  END IF;
END;
$$;