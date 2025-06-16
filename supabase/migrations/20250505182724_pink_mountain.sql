/*
  # Create Admin User

  1. Creates the initial admin user
    - Email: mudhirabu@gmail.com
    - Password: password@admin
    - Role: admin
  
  2. Handles duplicates
    - Checks for existing user before creation
    - Uses safe insert operations
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a new UUID for the admin user
  admin_user_id := gen_random_uuid();

  -- Create auth user if doesn't exist
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    last_sign_in_at
  ) 
  SELECT
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'mudhirabu@gmail.com',
    crypt('password@admin', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    true,
    '',
    '',
    '',
    '',
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'mudhirabu@gmail.com'
  );

  -- Create public user if doesn't exist
  INSERT INTO public.users (
    id,
    username,
    role,
    email,
    created_at,
    updated_at
  )
  SELECT
    admin_user_id,
    'Administrator',
    'admin',
    'mudhirabu@gmail.com',
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'mudhirabu@gmail.com'
  );

END $$;