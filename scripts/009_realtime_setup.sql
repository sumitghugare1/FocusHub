-- FocusHub Database Schema: Realtime Configuration
-- Enable realtime for specific tables

-- Enable realtime for room members (for presence)
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- Enable realtime for room messages (for chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;

-- Enable realtime for focus sessions (for live timer sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for rooms (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
