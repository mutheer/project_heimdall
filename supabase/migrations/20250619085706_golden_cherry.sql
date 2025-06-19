/*
  # Fix Users Table and Authentication System

  1. Changes
    - Drop and recreate users table without problematic foreign key
    - Set up proper user registration flow
    - Create signup functionality
    - Fix authentication policies

  2. Security
    - Enable RLS on users table
    - Add proper policies for user management
    - Set up secure user registration
*/

-- First, drop existing foreign key constraint that's causing issues
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Drop existing users table to recreate it properly
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table without foreign key to auth.users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
  email text NOT NULL UNIQUE,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email AND role = 'viewer');

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

CREATE POLICY "Allow user registration"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new user profile when auth user is created
  INSERT INTO public.users (
    id,
    username,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    now(),
    now()
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create admin user in auth.users if it doesn't exist
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
  
  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    -- Generate a new UUID
    v_user_id := gen_random_uuid();
    
    -- Insert into auth.users
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
      '{"role":"admin","username":"Admin User"}',
      true,
      'authenticated'
    );

    -- Insert into public.users (trigger will handle this, but let's be explicit)
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
    ) ON CONFLICT (email) DO UPDATE SET
      role = 'admin',
      updated_at = now();
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"role":"admin","username":"Admin User"}',
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
    ) ON CONFLICT (email) DO UPDATE SET
      role = 'admin',
      updated_at = now();
  END IF;
END $$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp trigger
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Update other tables to reference the new users table properly
-- Update foreign key references in other tables
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE alerts ADD CONSTRAINT alerts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_generated_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_generated_by_fkey 
  FOREIGN KEY (generated_by) REFERENCES users(id);

ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE system_settings ADD CONSTRAINT system_settings_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey;
ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE scheduled_reports DROP CONSTRAINT IF EXISTS scheduled_reports_created_by_fkey;
ALTER TABLE scheduled_reports ADD CONSTRAINT scheduled_reports_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id);