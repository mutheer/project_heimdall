/*
  # Create admin table and initial admin user

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `admins` table
    - Add policy for authenticated users to read admin data
*/

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin data"
  ON admins
  FOR SELECT
  TO public
  USING (true);

-- Insert initial admin user
INSERT INTO admins (email, password)
VALUES ('lorrittagaogane@gmail.com', 'admin');