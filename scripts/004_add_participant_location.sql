-- Add location fields to call_history table
ALTER TABLE call_history
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_flag TEXT,
ADD COLUMN IF NOT EXISTS location_code TEXT;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_call_history_location ON call_history(location_country);
