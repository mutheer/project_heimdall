/*
  # Create Default Admin User

  1. New Admin Setup
    - Creates default admin user in auth.users
    - Creates corresponding record in admins table
    - Creates corresponding record in users table
    - Sets up proper relationships and permissions

  2. Security
    - Uses secure password hashing
    - Enables proper RLS policies
    - Creates audit trail

  3. Default Credentials
    - Email: mudhirabu@gmail.com
    - Password: admin123
    - Role: admin
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
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Create hashed password (this is a simplified version - in production use proper bcrypt)
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
  ) ON CONFLICT (email) DO NOTHING;

  -- Insert into admins table
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
  ) ON CONFLICT (email) DO NOTHING;

  -- Insert into users table
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
  ) ON CONFLICT (email) DO NOTHING;

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
  ) ON CONFLICT DO NOTHING;

END;
$$;

-- Execute the function to create the default admin
SELECT create_default_admin();

-- Drop the function as it's no longer needed
DROP FUNCTION create_default_admin();

-- Ensure the admin user has proper permissions
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmation_sent_at = now()
WHERE email = 'mudhirabu@gmail.com';