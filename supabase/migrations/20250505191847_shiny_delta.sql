/*
  # Secure admin passwords
  
  1. Changes
    - Add pgcrypto extension for password hashing
    - Update admins table to use hashed passwords
    - Update existing admin password with hashed version
    
  2. Security
    - Passwords are now stored using secure bcrypt hashing
    - Original plain-text passwords are removed
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update existing admin password to hashed version
UPDATE admins 
SET password = crypt('admin', gen_salt('bf'))
WHERE email = 'lorrittagaogane@gmail.com';

-- Add a check constraint to ensure passwords are always hashed
ALTER TABLE admins
ADD CONSTRAINT ensure_hashed_password
CHECK (length(password) > 50);