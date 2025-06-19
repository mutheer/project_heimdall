/*
  # Update admin password to meet minimum requirements

  1. Changes
    - Update admin password from "admin" to "admin123" to meet Supabase's minimum password length requirement
    - Update both admins table and auth.users table

  2. Security
    - Ensures password meets minimum 6 character requirement
    - Maintains proper password hashing
*/

-- Update admin password in admins table
UPDATE admins 
SET password = crypt('admin123', gen_salt('bf'))
WHERE email = 'mudhirabu@gmail.com';

-- Update admin password in auth.users table
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'mudhirabu@gmail.com';

-- Ensure the admin user exists in admins table with correct password
INSERT INTO admins (email, password, role)
VALUES ('mudhirabu@gmail.com', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO UPDATE
SET password = crypt('admin123', gen_salt('bf'));

-- Ensure the admin user exists in auth.users table with correct password
DO $$
DECLARE
  v_user_id uuid;
  admin_email text := 'mudhirabu@gmail.com';
  admin_password text := 'admin123';
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  -- If user exists, update their password
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
    
    -- Ensure public.users entry exists
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
      admin_email,
      'admin',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      role = 'admin',
      updated_at = now();
  ELSE
    -- Create new auth user
    v_user_id := gen_random_uuid();
    
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
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      true,
      'authenticated'
    );

    -- Create public.users entry
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
      admin_email,
      'admin',
      now(),
      now()
    );
  END IF;
END $$;