-- Create rooms table with password and auto-delete settings
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '60 days'),
  created_by TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call history table
CREATE TABLE IF NOT EXISTS call_history (
  id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  file_id INTEGER
);

-- Create files table with virus scan tracking
CREATE TABLE IF NOT EXISTS uploaded_files (
  id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  virus_scan_status TEXT DEFAULT 'pending', -- pending, scanning, clean, infected
  virus_scan_result TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to chat_messages for files
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_file 
FOREIGN KEY (file_id) 
REFERENCES uploaded_files(id) 
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_history_room ON call_history(room_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_files_room ON uploaded_files(room_id, uploaded_at);

-- Create auto-cleanup function for expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  UPDATE rooms 
  SET is_active = false 
  WHERE is_active = true 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
