/*
  # Add insert policy for users table

  1. Changes
    - Add RLS policy to allow admins to insert new users
    
  2. Security
    - Only admins can create new users
    - Policy checks the role of the authenticated user
*/

CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );