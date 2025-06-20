-- Ensure pgcrypto extension is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add the second admin user
DO $$
DECLARE
  admin_user_id uuid;
  existing_user_id uuid;
  hashed_password text;
  admin_email text := 'muthirabu@gmail.com';
  admin_password text := 'admin123';
BEGIN
  -- Check if admin user already exists in admins table
  IF EXISTS (SELECT 1 FROM public.admins WHERE email = admin_email) THEN
    RAISE NOTICE 'Admin user % already exists in admins table, skipping creation', admin_email;
    RETURN;
  END IF;
  
  -- Check if user already exists in users table and get their ID
  SELECT id INTO existing_user_id 
  FROM public.users 
  WHERE email = admin_email;
  
  -- If user exists in users table, use their ID, otherwise generate new one
  IF existing_user_id IS NOT NULL THEN
    admin_user_id := existing_user_id;
    RAISE NOTICE 'User % already exists in users table, using existing ID: %', admin_email, admin_user_id;
  ELSE
    admin_user_id := gen_random_uuid();
    RAISE NOTICE 'Creating new user % with ID: %', admin_email, admin_user_id;
  END IF;
  
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
  
  -- Handle users table insertion/update
  IF existing_user_id IS NOT NULL THEN
    -- Update existing user to admin role
    UPDATE public.users 
    SET 
      role = 'admin',
      username = 'Admin User 2',
      updated_at = now()
    WHERE id = admin_user_id;
    RAISE NOTICE 'Updated existing user to admin role';
  ELSE
    -- Insert new user
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
    RAISE NOTICE 'Created new user record';
  END IF;
  
  RAISE NOTICE 'Second admin user processed successfully with email: %', admin_email;
  RAISE NOTICE 'Admin user ID: %', admin_user_id;
  
EXCEPTION WHEN unique_violation THEN
  -- Handle any remaining unique constraint violations
  RAISE NOTICE 'Unique constraint violation handled for user: %', admin_email;
  
  -- Try to get existing user ID
  SELECT id INTO admin_user_id FROM public.users WHERE email = admin_email;
  
  IF admin_user_id IS NOT NULL THEN
    -- Update existing user to admin role
    UPDATE public.users 
    SET role = 'admin', username = 'Admin User 2', updated_at = now()
    WHERE email = admin_email;
    
    -- Insert into admins table if not exists
    BEGIN
      INSERT INTO public.admins (
        id,
        email,
        password,
        role,
        created_at
      ) VALUES (
        admin_user_id,
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        'admin',
        now()
      );
    EXCEPTION WHEN unique_violation THEN
      -- Admin already exists, just update password
      UPDATE public.admins 
      SET password = crypt(admin_password, gen_salt('bf'))
      WHERE email = admin_email;
    END;
    
    RAISE NOTICE 'Handled existing user and promoted to admin: %', admin_email;
  ELSE
    RAISE WARNING 'Could not find or create user: %', admin_email;
  END IF;
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
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not test admin verification: %', SQLERRM;
END;
$$;

-- Verify both admin users exist
DO $$
DECLARE
  admin1_count integer;
  admin2_count integer;
  total_admins integer;
  users1_count integer;
  users2_count integer;
BEGIN
  -- Count first admin in admins table
  SELECT COUNT(*) INTO admin1_count 
  FROM public.admins 
  WHERE email = 'mudhirabu@gmail.com';
  
  -- Count second admin in admins table
  SELECT COUNT(*) INTO admin2_count 
  FROM public.admins 
  WHERE email = 'muthirabu@gmail.com';
  
  -- Count total admins
  SELECT COUNT(*) INTO total_admins 
  FROM public.admins 
  WHERE role = 'admin';
  
  -- Count users with admin role
  SELECT COUNT(*) INTO users1_count 
  FROM public.users 
  WHERE email = 'mudhirabu@gmail.com' AND role = 'admin';
  
  SELECT COUNT(*) INTO users2_count 
  FROM public.users 
  WHERE email = 'muthirabu@gmail.com' AND role = 'admin';
  
  RAISE NOTICE 'Admin users verification:';
  RAISE NOTICE '  Admins table:';
  RAISE NOTICE '    mudhirabu@gmail.com: % record(s)', admin1_count;
  RAISE NOTICE '    muthirabu@gmail.com: % record(s)', admin2_count;
  RAISE NOTICE '    Total admin users: %', total_admins;
  RAISE NOTICE '  Users table (admin role):';
  RAISE NOTICE '    mudhirabu@gmail.com: % record(s)', users1_count;
  RAISE NOTICE '    muthirabu@gmail.com: % record(s)', users2_count;
  
  IF admin2_count >= 1 AND users2_count >= 1 THEN
    RAISE NOTICE 'SUCCESS: Second admin user exists and is properly configured';
  ELSE
    RAISE WARNING 'WARNING: Second admin user may be missing or misconfigured';
  END IF;
END;
$$;