/*
  # Sync admins to users table for authentication

  1. Data Migration
    - Insert admin records into users table if they don't exist
    - Ensure admins can authenticate through the standard auth flow
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper role assignment
*/

-- First, insert any admins that don't exist in the users table
-- We'll use the admin's email and set a default username
INSERT INTO public.users (id, username, role, email, created_at, updated_at)
SELECT 
  a.id,
  COALESCE(SPLIT_PART(a.email, '@', 1), 'admin') as username,
  'admin' as role,
  a.email,
  a.created_at,
  NOW() as updated_at
FROM public.admins a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.email = a.email
)
ON CONFLICT (email) DO NOTHING;

-- Create a function to handle new admin creation
CREATE OR REPLACE FUNCTION handle_new_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert corresponding user record when a new admin is created
  INSERT INTO public.users (id, username, role, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'admin'),
    'admin',
    NEW.email,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync new admins to users table
DROP TRIGGER IF EXISTS sync_admin_to_users ON public.admins;
CREATE TRIGGER sync_admin_to_users
  AFTER INSERT ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_admin();