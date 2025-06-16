/*
  # Add admin user if not exists
  
  1. Changes
    - Add admin user to auth.users if email doesn't exist
    - Add corresponding user profile to public.users
  2. Security
    - Ensures no duplicate users are created
    - Maintains referential integrity between auth and public users
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'mudhirabu@gmail.com';
  
  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
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
      '00000000-0000-0000-0000-000000000000',
      'mudhirabu@gmail.com',
      crypt('password@admin', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated'
    ) RETURNING id INTO v_user_id;

    -- Insert into public.users using the same id
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
  END IF;
END $$;