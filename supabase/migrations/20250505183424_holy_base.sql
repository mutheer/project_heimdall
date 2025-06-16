-- Update admin user role and ensure proper setup
DO $$
DECLARE
  admin_email text := 'mudhirabu@gmail.com';
  admin_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

  IF admin_id IS NOT NULL THEN
    -- Update the user's role in public.users to ensure they're an admin
    UPDATE public.users
    SET role = 'admin'
    WHERE id = admin_id;

    -- Ensure the user is marked as authenticated and super_admin in auth.users
    UPDATE auth.users
    SET 
      role = 'authenticated',
      is_super_admin = true,
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = admin_id;
  END IF;
END $$;