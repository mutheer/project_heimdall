/*
  # Add system_logs table to external systems schema
  
  1. Changes
    - Add system_logs table for storing external system activity
    - Add indexes for better query performance
    
  2. Security
    - Enable RLS on system_logs table
    - Add policies for access control
*/

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  details jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON system_logs
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS system_logs_created_at_idx ON system_logs(created_at DESC);