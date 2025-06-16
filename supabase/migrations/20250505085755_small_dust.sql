/*
  # Initial Schema Setup for HealthGuard AI

  1. New Tables
    - users: Store user information and authentication
    - devices: Medical IoT devices being monitored
    - logs: Device activity and system logs
    - threats: Security threats detected
    - threat_intelligence: External threat data and patterns
    - alerts: System notifications and alerts
    - reports: Generated system reports
    - threat_database: Known threat patterns and rules

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access (admin, analyst, viewer)
    - Secure audit logging
*/

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

-- Threat Database (known patterns and rules)
CREATE TABLE IF NOT EXISTS threat_database (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_database ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Devices policies
CREATE POLICY "All authenticated users can view devices"
  ON devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage devices"
  ON devices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Logs policies
CREATE POLICY "Authenticated users can view logs"
  ON logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can create logs"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')
  ));

-- Threats policies
CREATE POLICY "All authenticated users can view threats"
  ON threats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can manage threats"
  ON threats FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')
  ));

-- Alerts policies
CREATE POLICY "Users can view assigned alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')
  ));

CREATE POLICY "Admins and analysts can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')
  ));

-- Reports policies
CREATE POLICY "All authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'analyst')
  ));

-- Functions and Triggers

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_devices_timestamp
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_threats_timestamp
  BEFORE UPDATE ON threats
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_alerts_timestamp
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Auto-create alert on new threat
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

CREATE TRIGGER trigger_create_alert
  AFTER INSERT ON threats
  FOR EACH ROW
  EXECUTE FUNCTION create_alert_for_threat();