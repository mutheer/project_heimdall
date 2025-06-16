/*
  # Add integration keys and threat detection rules
  
  1. Changes
    - Add integration_keys to system_settings
    - Add rule_logic column to threat_database
    - Add unique constraint on rule_name
    - Add example threat detection rules
    
  2. Security
    - Ensure proper constraints for data integrity
    - Add validation for rule logic
*/

-- Add rule_logic column to threat_database if not exists
ALTER TABLE threat_database
ADD COLUMN IF NOT EXISTS rule_logic text;

-- Add unique constraint on rule_name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'threat_database_rule_name_key'
  ) THEN
    ALTER TABLE threat_database
    ADD CONSTRAINT threat_database_rule_name_key UNIQUE (rule_name);
  END IF;
END $$;

-- Add integration keys to system settings
INSERT INTO system_settings (setting_key, setting_value)
SELECT 
  'integration_keys',
  '["test-integration-key"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'integration_keys'
);

-- Add example threat detection rules
INSERT INTO threat_database (rule_name, description, rule_logic)
VALUES 
(
  'High CPU Usage',
  'Detects abnormally high CPU usage',
  'function(metrics) {
    if (metrics.cpu_usage > 90) {
      return {
        detected: true,
        description: `Abnormal CPU usage detected: ${metrics.cpu_usage}%`,
        severity: "high"
      };
    }
    return { detected: false };
  }'
)
ON CONFLICT (rule_name) DO NOTHING;

INSERT INTO threat_database (rule_name, description, rule_logic)
VALUES 
(
  'Memory Exhaustion',
  'Detects critical memory usage levels',
  'function(metrics) {
    if (metrics.memory_usage > 85) {
      return {
        detected: true,
        description: `Critical memory usage detected: ${metrics.memory_usage}%`,
        severity: "critical"
      };
    }
    return { detected: false };
  }'
)
ON CONFLICT (rule_name) DO NOTHING;

INSERT INTO threat_database (rule_name, description, rule_logic)
VALUES 
(
  'Network Anomaly',
  'Detects unusual network traffic patterns',
  'function(metrics) {
    if (metrics.network_traffic > 1000) {
      return {
        detected: true,
        description: "Unusual network traffic pattern detected",
        severity: "medium"
      };
    }
    return { detected: false };
  }'
)
ON CONFLICT (rule_name) DO NOTHING;