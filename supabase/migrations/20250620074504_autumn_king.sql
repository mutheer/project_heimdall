/*
  # Create Default Admin User

  1. New Tables
    - Ensures admin user exists in both auth.users and public.users tables
    
  2. Security
    - Creates the default admin user with proper authentication
    - Sets up the user profile in the public.users table
    
  3. Changes
    - Inserts default admin user if not exists
    - Ensures proper role assignment
    - Links auth user to public user profile
*/

-- First, let's ensure we have the proper functions for user management
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    email = NEW.email,
    role = COALESCE(NEW.raw_user_meta_data->>'role', users.role),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the default admin user if it doesn't exist
DO $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean := false;
BEGIN
  -- Check if admin user already exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE email = 'mudhirabu@gmail.com'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Generate a UUID for the admin user
    admin_user_id := gen_random_uuid();
    
    -- Insert into auth.users (this is the main authentication table)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'mudhirabu@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      null,
      null,
      '{"provider": "email", "providers": ["email"]}',
      '{"username": "admin", "role": "admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into public.users (this will be handled by the trigger, but let's ensure it)
    INSERT INTO public.users (id, username, email, role, created_at, updated_at)
    VALUES (
      admin_user_id,
      'admin',
      'mudhirabu@gmail.com',
      'admin',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = 'admin',
      email = 'mudhirabu@gmail.com',
      role = 'admin',
      updated_at = now();
      
    -- Also ensure the admin exists in the admins table
    INSERT INTO public.admins (id, email, password, role, created_at)
    VALUES (
      admin_user_id,
      'mudhirabu@gmail.com',
      crypt('admin123', gen_salt('bf')),
      'admin',
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      password = crypt('admin123', gen_salt('bf')),
      role = 'admin';
      
    RAISE NOTICE 'Default admin user created successfully';
  ELSE
    RAISE NOTICE 'Default admin user already exists';
  END IF;
END $$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper RLS policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to ensure admin access
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
CREATE POLICY "Enable read access for authenticated users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable update for own profile" ON public.users;
CREATE POLICY "Enable update for own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
CREATE POLICY "Enable insert for authenticated users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for admins" ON public.users;
CREATE POLICY "Enable delete for admins"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (is_admin());