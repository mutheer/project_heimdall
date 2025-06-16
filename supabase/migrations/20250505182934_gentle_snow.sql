/*
  # Initial Schema Setup

  1. Tables
    - Creates all necessary tables for the healthcare threat detection system
    - Includes users, devices, logs, threats, alerts, and more
  
  2. Security
    - Enables RLS on all tables
    - Creates policies with existence checks
    - Sets up proper access controls for different user roles

  3. Functions & Triggers
    - Creates update timestamp triggers
    - Sets up alert creation automation
    - Handles new user registration
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer')),
  email TEXT NOT NULL UNIQUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'warning')),
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(device_id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  log_type TEXT NOT NULL,
  log_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Threat Intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threats table
CREATE TABLE IF NOT EXISTS threats (
  threat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_resolved BOOLEAN DEFAULT false,
  device_id UUID REFERENCES devices(device_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id UUID REFERENCES threats(threat_id),
  alert_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Threat Database table
CREATE TABLE IF NOT EXISTS threat_database (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_database ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Admins can do everything" ON users;
  DROP POLICY IF EXISTS "All authenticated users can view devices" ON devices;
  DROP POLICY IF EXISTS "Admins can manage devices" ON devices;
  DROP POLICY IF EXISTS "Authenticated users can view logs" ON logs;
  DROP POLICY IF EXISTS "Admins and analysts can create logs" ON logs;
  DROP POLICY IF EXISTS "All authenticated users can view threats" ON threats;
  DROP POLICY IF EXISTS "Admins and analysts can manage threats" ON threats;
  DROP POLICY IF EXISTS "Users can view assigned alerts" ON alerts;
  DROP POLICY IF EXISTS "Admins and analysts can manage alerts" ON alerts;
  DROP POLICY IF EXISTS "All authenticated users can view reports" ON reports;
  DROP POLICY IF EXISTS "Admins and analysts can create reports" ON reports;
  DROP POLICY IF EXISTS "Authenticated users can view threat database" ON threat_database;
END $$;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (role = 'viewer');

CREATE POLICY "Admins can do everything"
  ON users FOR ALL
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Device policies
CREATE POLICY "All authenticated users can view devices"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage devices"
  ON devices FOR ALL
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Log policies
CREATE POLICY "Authenticated users can view logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can create logs"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')));

-- Threat policies
CREATE POLICY "All authenticated users can view threats"
  ON threats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can manage threats"
  ON threats FOR ALL
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')));

-- Alert policies
CREATE POLICY "Users can view assigned alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')));

CREATE POLICY "Admins and analysts can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')));

-- Report policies
CREATE POLICY "All authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS ( SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')));

-- Threat database policies
CREATE POLICY "Authenticated users can view threat database"
  ON threat_database FOR SELECT
  TO authenticated
  USING (true);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamp triggers
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_devices_timestamp ON devices;
CREATE TRIGGER update_devices_timestamp
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_threats_timestamp ON threats;
CREATE TRIGGER update_threats_timestamp
  BEFORE UPDATE ON threats
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_alerts_timestamp ON alerts;
CREATE TRIGGER update_alerts_timestamp
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Create alert creation trigger
CREATE OR REPLACE FUNCTION create_alert_for_threat()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO alerts (threat_id, alert_type, status)
  VALUES (NEW.threat_id, 
    CASE 
      WHEN NEW.severity_level = 'critical' THEN 'immediate'
      WHEN NEW.severity_level = 'high' THEN 'urgent'
      ELSE 'standard'
    END,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_alert ON threats;
CREATE TRIGGER trigger_create_alert
  AFTER INSERT ON threats
  FOR EACH ROW
  EXECUTE FUNCTION create_alert_for_threat();

-- Create user profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    username,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'viewer',
    now(),
    now()
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create initial admin user
DO $$
DECLARE
  admin_email text := 'mudhirabu@gmail.com';
  admin_password text := 'password@admin';
  admin_id uuid;
BEGIN
  -- Only create admin if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    -- Generate UUID for admin
    admin_id := gen_random_uuid();
    
    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      role,
      is_super_admin
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      true
    );

    -- Create public user
    INSERT INTO public.users (
      id,
      username,
      role,
      email,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      'Administrator',
      'admin',
      admin_email,
      now(),
      now()
    );
  END IF;
END $$;