-- Add call_type column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'video';

-- Add comment to explain call types
COMMENT ON COLUMN rooms.call_type IS 'Call type: voice, video, team, or group';

-- Add check constraint for valid call types
ALTER TABLE rooms 
ADD CONSTRAINT check_call_type 
CHECK (call_type IN ('voice', 'video', 'team', 'group'));
