-- This migration ensures the admin user exists in the 'admins' and 'public.users' tables,
-- linking to the 'auth.users' entry without modifying its password directly.

DO $$
DECLARE
  admin_email text := 'mudhirabu@gmail.com';
  admin_password text := 'admin123'; -- This password is for the 'admins' table, not 'auth.users'
  v_auth_user_id uuid;
  hashed_password text;
BEGIN
  -- 1. Get the ID of the admin user from auth.users
  -- This assumes the user already exists in auth.users (e.g., created via dashboard or signup)
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = admin_email;

  -- If the user does not exist in auth.users, we cannot proceed with linking.
  -- In a real scenario, you might want to raise an error or log a warning.
  -- For this context, we assume it exists due to prior manual password reset.
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user % not found in auth.users. Please create it first via Supabase dashboard or client library.', admin_email;
  END IF;

  -- Hash the password for the 'admins' table (your custom admin table)
  hashed_password := crypt(admin_password, gen_salt('bf'));

  -- 2. Ensure the admin user exists in the 'admins' table
  -- This table is custom and can be managed directly by the migration.
  INSERT INTO public.admins (id, email, password, role, created_at)
  VALUES (v_auth_user_id, admin_email, hashed_password, 'admin', now())
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id, -- Update ID if email exists but ID is different (unlikely but safe)
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    created_at = admins.created_at -- Preserve original created_at
  ;

  -- 3. Ensure the admin user exists in the 'public.users' table
  -- This table is also custom. While handle_new_user trigger usually populates it,
  -- this ensures the admin entry is correct and has the 'admin' role.
  INSERT INTO public.users (id, username, email, role, created_at, updated_at)
  VALUES (v_auth_user_id, 'Admin User', admin_email, 'admin', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now()
  ;

  -- Optional: Ensure email is confirmed in auth.users if not already
  -- This does not touch the password, only confirmation status.
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
      updated_at = now()
  WHERE id = v_auth_user_id;

END $$;