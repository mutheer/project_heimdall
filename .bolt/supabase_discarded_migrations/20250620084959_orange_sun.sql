/*
  # Add second admin user

  1. Changes
    - Add admin user with email muthirabu@gmail.com
    - Use same password (admin123) as existing admin
    - Create entries in both admins and users tables
    
  2. Security
    - Password is properly hashed using bcrypt
    - User gets admin role in both tables
*/

-- Ensure pgcrypto extension is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add the second admin user
DO $$
DECLARE
  admin_user_id uuid;
  hashed_password text;
  admin_email text := 'muthirabu@gmail.com';
  admin_password text := 'admin123';
BEGIN
  -- Check if admin user already exists
  IF EXISTS (SELECT 1 FROM public.admins WHERE email = admin_email) THEN
    RAISE NOTICE 'Admin user % already exists, skipping creation', admin_email;
    RETURN;
  END IF;
  
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
    'Admin User 2',
    admin_email,
    'admin',
    now(),
    now()
  );
  
  RAISE NOTICE 'Second admin user created successfully with email: %', admin_email;
  RAISE NOTICE 'Admin user ID: %', admin_user_id;
  
END;
$$;

-- Test the new admin authentication
DO $$
BEGIN
  -- Test the verify_admin function for the new admin
  IF verify_admin('muthirabu@gmail.com', 'admin123') THEN
    RAISE NOTICE 'SUCCESS: Second admin verification works correctly';
  ELSE
    RAISE WARNING 'FAILED: Second admin verification failed';
  END IF;
END;
$$;

-- Verify both admin users exist
DO $$
DECLARE
  admin1_count integer;
  admin2_count integer;
  total_admins integer;
BEGIN
  -- Count first admin
  SELECT COUNT(*) INTO admin1_count 
  FROM public.admins 
  WHERE email = 'mudhirabu@gmail.com';
  
  -- Count second admin
  SELECT COUNT(*) INTO admin2_count 
  FROM public.admins 
  WHERE email = 'muthirabu@gmail.com';
  
  -- Count total admins
  SELECT COUNT(*) INTO total_admins 
  FROM public.admins 
  WHERE role = 'admin';
  
  RAISE NOTICE 'Admin users verification:';
  RAISE NOTICE '  mudhirabu@gmail.com: % record(s)', admin1_count;
  RAISE NOTICE '  muthirabu@gmail.com: % record(s)', admin2_count;
  RAISE NOTICE '  Total admin users: %', total_admins;
  
  IF admin1_count = 1 AND admin2_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Both admin users exist and are properly configured';
  ELSE
    RAISE WARNING 'WARNING: Some admin users may be missing or misconfigured';
  END IF;
END;
$$;