/*
  # Add admin features and permissions

  1. New Tables
    - `system_settings`: Stores system-wide configuration
    - `notification_settings`: Stores user notification preferences
    - `scheduled_reports`: Stores report scheduling information

  2. Changes
    - Add new columns to existing tables
    - Add new policies for admin access

  3. Security
    - Enable RLS on new tables
    - Add policies for admin access
*/

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification settings"
  ON notification_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  schedule text NOT NULL,
  recipients jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_run_at timestamptz,
  next_run_at timestamptz,
  enabled boolean DEFAULT true
);

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled reports"
  ON scheduled_reports
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Add export_format column to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS export_format text DEFAULT 'pdf';

-- Add scheduled_by column to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS scheduled_by uuid REFERENCES scheduled_reports(id);

-- Add last_notification column to alerts table
ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS last_notification timestamptz;