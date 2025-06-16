/*
  # Create initial admin user

  1. Changes
    - Creates admin user in auth.users
    - Creates corresponding entry in public.users table
    - Sets up proper role and permissions

  2. Security
    - Password is hashed using bcrypt
    - User is given admin role
    - Email is verified by default
*/

-- Create admin user with a specific UUID
DO $$
DECLARE
  admin_user_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- First create the user in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    is_super_admin
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'mudhirabu8216@gmail.com',
    crypt('password@admin', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Then create the corresponding entry in public.users
  INSERT INTO public.users (
    id,
    username,
    role,
    email,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'Administrator',
    'admin',
    'mudhirabu8216@gmail.com',
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

END $$;