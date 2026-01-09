-- Signaling tables for WebRTC connections
CREATE TABLE IF NOT EXISTS room_participants (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS signaling_messages (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  message_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  consumed BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_messages_to_user ON signaling_messages(to_user_id, consumed);
CREATE INDEX IF NOT EXISTS idx_signaling_messages_created ON signaling_messages(created_at);

-- Clean up old participants (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_participants() RETURNS void AS $$
BEGIN
  DELETE FROM room_participants WHERE last_seen < NOW() - INTERVAL '5 minutes';
  DELETE FROM signaling_messages WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
