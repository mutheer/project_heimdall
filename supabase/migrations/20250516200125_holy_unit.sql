/*
  # Add external systems table and monitoring capabilities
  
  1. New Tables
    - external_systems: Store connected external system details
    - system_logs: Track external system activity
    
  2. Security
    - Enable RLS on new tables
    - Add policies for admin access
*/

-- Create external systems table
CREATE TABLE IF NOT EXISTS external_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  anon_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  description text,
  last_sync timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system logs table
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
ALTER TABLE external_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage external systems"
  ON external_systems
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

CREATE POLICY "Authenticated users can view external systems"
  ON external_systems
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Add trigger for updating timestamp
CREATE TRIGGER update_external_systems_timestamp
  BEFORE UPDATE ON external_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();