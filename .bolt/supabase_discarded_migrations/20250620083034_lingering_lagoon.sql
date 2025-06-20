/*
  # Synchronize admin passwords to 'admin123'
  
  1. Changes
    - Update password in auth.users table to 'admin123' (hashed)
    - Update password in admins table to 'admin123' (hashed)
    - Ensure consistency between all authentication tables
    - Verify admin user exists in all required tables
    
  2. Security
    - Uses proper bcrypt hashing for all passwords
    - Maintains referential integrity between tables
    - Ensures email confirmation status
*/

DO $$
DECLARE
  admin_email text := 'mudhirabu@gmail.com';
  admin_password text := 'admin123';
  v_auth_user_id uuid;
  hashed_password text;
BEGIN
  -- Generate hashed password using bcrypt
  hashed_password := crypt(admin_password, gen_salt('bf'));
  
  -- 1. Find or create the admin user in auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF v_auth_user_id IS NULL THEN
    -- Create new admin user in auth.users
    v_auth_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      v_auth_user_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      hashed_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","username":"Admin User"}',
      true,
      'authenticated'
    );
    
    RAISE NOTICE 'Created new admin user in auth.users with ID: %', v_auth_user_id;
  ELSE
    -- Update existing admin user password in auth.users
    UPDATE auth.users
    SET 
      encrypted_password = hashed_password,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_auth_user_id;
    
    RAISE NOTICE 'Updated existing admin user password in auth.users with ID: %', v_auth_user_id;
  END IF;
  
  -- 2. Ensure admin user exists in admins table with correct password
  INSERT INTO public.admins (id, email, password, role, created_at)
  VALUES (v_auth_user_id, admin_email, hashed_password, 'admin', now())
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    password = EXCLUDED.password,
    role = EXCLUDED.role;
    
  RAISE NOTICE 'Synchronized admin user in admins table';
  
  -- 3. Ensure admin user exists in public.users table with correct role
  INSERT INTO public.users (id, username, email, role, created_at, updated_at)
  VALUES (v_auth_user_id, 'Admin User', admin_email, 'admin', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now()
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    updated_at = now();
    
  RAISE NOTICE 'Synchronized admin user in public.users table';
  
  -- 4. Verify the password synchronization by testing both authentication methods
  -- Test verify_admin function (uses admins table)
  IF verify_admin(admin_email, admin_password) THEN
    RAISE NOTICE 'SUCCESS: verify_admin function works with new password';
  ELSE
    RAISE WARNING 'FAILED: verify_admin function does not work with new password';
  END IF;
  
  -- 5. Ensure email is confirmed and user can authenticate
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    confirmation_sent_at = now(),
    updated_at = now()
  WHERE id = v_auth_user_id;
  
  RAISE NOTICE 'Password synchronization completed successfully for admin user: %', admin_email;
  
END $$;

-- Additional verification: Check that all tables have consistent data
DO $$
DECLARE
  auth_count integer;
  admins_count integer;
  users_count integer;
  admin_email text := 'mudhirabu@gmail.com';
BEGIN
  -- Count admin user in each table
  SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = admin_email;
  SELECT COUNT(*) INTO admins_count FROM public.admins WHERE email = admin_email;
  SELECT COUNT(*) INTO users_count FROM public.users WHERE email = admin_email;
  
  RAISE NOTICE 'Verification - Admin user exists in:';
  RAISE NOTICE '  auth.users: % record(s)', auth_count;
  RAISE NOTICE '  public.admins: % record(s)', admins_count;
  RAISE NOTICE '  public.users: % record(s)', users_count;
  
  IF auth_count = 1 AND admins_count = 1 AND users_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Admin user exists in all required tables';
  ELSE
    RAISE WARNING 'WARNING: Admin user missing from some tables';
  END IF;
END $$;