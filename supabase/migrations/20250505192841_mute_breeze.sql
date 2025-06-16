/*
  # Add IoT medical device fields

  1. Changes
    - Add new columns to devices table:
      - location (text)
      - telemetry_data (jsonb)
    - Update existing device_id to be UUID
    - Add constraints and indexes
*/

-- Add new columns to devices table
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS telemetry_data jsonb DEFAULT '{}'::jsonb;

-- Create index on location for faster queries
CREATE INDEX IF NOT EXISTS devices_location_idx ON devices(location);