-- Message Expiration Feature
-- Adds auto-expiration for room chat messages (24-hour ephemeral chats)
-- System messages, host/moderator messages, and pinned messages never expire

-- Add expiration tracking columns to room_messages table
ALTER TABLE IF EXISTS public.room_messages
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'member';

-- Add index for fast expiration queries
CREATE INDEX IF NOT EXISTS idx_room_messages_expires_at 
  ON public.room_messages(room_id, expires_at) 
  WHERE expires_at IS NOT NULL;

-- Function to delete expired messages
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.room_messages
  WHERE 
    expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_pinned = false
    AND message_type = 'text';
END;
$$;

-- Trigger to auto-populate author_role when message is inserted
-- This ensures we know the role of the author at insertion time
CREATE OR REPLACE FUNCTION public.set_message_author_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  member_role TEXT;
BEGIN
  -- Get the author's role in the room
  SELECT role INTO member_role
  FROM public.room_members
  WHERE room_id = NEW.room_id AND user_id = NEW.user_id
  LIMIT 1;

  -- Set author_role
  NEW.author_role := COALESCE(member_role, 'member');

  -- Set expires_at based on message type and author role
  IF NEW.message_type = 'system' OR NEW.message_type = 'achievement' THEN
    -- System and achievement messages never expire
    NEW.expires_at := NULL;
  ELSIF NEW.author_role IN ('host', 'moderator') THEN
    -- Host and moderator messages never expire
    NEW.expires_at := NULL;
  ELSE
    -- Regular member messages expire after 24 hours
    NEW.expires_at := NOW() + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_message_author_role_trigger ON public.room_messages;

-- Create trigger
CREATE TRIGGER set_message_author_role_trigger
  BEFORE INSERT ON public.room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_author_role();
