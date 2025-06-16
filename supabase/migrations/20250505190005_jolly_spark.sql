/*
  # Fix authentication setup

  1. Changes
    - Create admin user with proper password hashing
    - Ensure user exists in both auth.users and public.users tables
    - Set up proper email confirmation and authentication
*/

-- First, ensure the auth.users table has the correct user
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'mudhirabu@gmail.com';
  
  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    -- Generate a new UUID
    v_user_id := gen_random_uuid();
    
    -- Insert into auth.users with proper password hashing
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
      role,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'mudhirabu@gmail.com',
      crypt('password@admin', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      true,
      'authenticated',
      '',
      ''
    );

    -- Insert into public.users
    INSERT INTO public.users (
      id,
      username,
      email,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Admin User',
      'mudhirabu@gmail.com',
      'admin',
      now(),
      now()
    );
  ELSE
    -- Update existing user to ensure correct setup
    UPDATE auth.users
    SET 
      encrypted_password = crypt('password@admin', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      raw_user_meta_data = '{"role":"admin"}',
      is_super_admin = true,
      role = 'authenticated',
      updated_at = now()
    WHERE id = v_user_id;

    -- Ensure public.users entry exists and is correct
    INSERT INTO public.users (
      id,
      username,
      email,
      role,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Admin User',
      'mudhirabu@gmail.com',
      'admin',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      role = 'admin',
      updated_at = now();
  END IF;
END $$;