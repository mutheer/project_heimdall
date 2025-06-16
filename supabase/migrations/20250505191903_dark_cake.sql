/*
  # Create verify_admin function
  
  1. New Functions
    - verify_admin: Securely verifies admin credentials using pgcrypto
    
  2. Security
    - Password verification happens entirely in the database
    - No plain-text passwords are transmitted
*/

CREATE OR REPLACE FUNCTION verify_admin(
  email_input text,
  password_input text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admins
    WHERE email = email_input
    AND password = crypt(password_input, password)
  );
END;
$$;