/*
  # Fix system logs policies

  1. Changes
    - Drop existing policies before recreating them
    - Ensure system_logs table exists
    - Add proper RLS policies
    
  2. Security
    - Enable RLS on system_logs table
    - Add policies for admin access
    - Allow read access for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage system logs" ON system_logs;
DROP POLICY IF EXISTS "Authenticated users can view system logs" ON system_logs;

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES external_systems(id),
  event_type text NOT NULL,
  user_id text,
  timestamp timestamptz NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage system logs"
  ON system_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

CREATE POLICY "Authenticated users can view system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (true);