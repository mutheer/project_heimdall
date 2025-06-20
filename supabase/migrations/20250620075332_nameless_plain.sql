/*
  # Create Default Admin User

  1. Changes
    - Create default admin user in auth.users table
    - Create corresponding records in admins and users tables
    - Handle existing records gracefully
    
  2. Security
    - Use proper password hashing
    - Set up authentication properly
*/

-- First, ensure we have the necessary functions
CREATE OR REPLACE FUNCTION create_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  hashed_password text;
  existing_user_id uuid;
BEGIN
  -- Check if admin user already exists in auth.users
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'mudhirabu@gmail.com';
  
  IF existing_user_id IS NOT NULL THEN
    -- User already exists, use existing ID
    admin_user_id := existing_user_id;
  ELSE
    -- Generate a UUID for the new admin user
    admin_user_id := gen_random_uuid();
    
    -- Create hashed password
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
      role,
      aud,
      confirmation_token,
      email_change_token_new,
      recovery_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'mudhirabu@gmail.com',
      hashed_password,
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '',
      '',
      ''
    );

    -- Create identity record for the user
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', 'mudhirabu@gmail.com'),
      'email',
      now(),
      now()
    );
  END IF;

  -- Create hashed password for our tables
  hashed_password := crypt('admin123', gen_salt('bf'));

  -- Insert into admins table if not exists
  IF NOT EXISTS (SELECT 1 FROM admins WHERE email = 'mudhirabu@gmail.com') THEN
    INSERT INTO admins (
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
    );
  ELSE
    -- Update existing admin record
    UPDATE admins 
    SET password = hashed_password,
        id = admin_user_id
    WHERE email = 'mudhirabu@gmail.com';
  END IF;

  -- Insert into users table if not exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'mudhirabu@gmail.com') THEN
    INSERT INTO users (
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
    );
  ELSE
    -- Update existing user record
    UPDATE users 
    SET role = 'admin',
        id = admin_user_id,
        updated_at = now()
    WHERE email = 'mudhirabu@gmail.com';
  END IF;

END;
$$;

-- Execute the function to create the default admin
SELECT create_default_admin();

-- Drop the function as it's no longer needed
DROP FUNCTION create_default_admin();

-- Ensure the admin user has proper permissions and confirmation
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now()), 
    confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
    updated_at = now()
WHERE email = 'mudhirabu@gmail.com';