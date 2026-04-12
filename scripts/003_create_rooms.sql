-- FocusHub Database Schema: Study Rooms
-- Tables for study rooms and room memberships

-- Study Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Room settings
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'programming', 'design', 'writing', 'math', 'science', 'languages', 'music', 'other')),
  is_private BOOLEAN DEFAULT false,
  password_hash TEXT, -- For private rooms
  max_participants INTEGER DEFAULT 50,
  
  -- Timer settings for the room
  focus_duration INTEGER DEFAULT 25,
  break_duration INTEGER DEFAULT 5,
  is_timer_synced BOOLEAN DEFAULT true, -- All participants follow same timer
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'scheduled')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  -- Stats
  total_sessions INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  
  -- Tags for searchability
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Participants/Members Table
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role in the room
  role TEXT DEFAULT 'member' CHECK (role IN ('host', 'moderator', 'member')),
  
  -- Member status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'focusing', 'break', 'offline')),
  
  -- Stats for this room
  focus_time_in_room INTEGER DEFAULT 0,
  sessions_in_room INTEGER DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

-- Room Chat Messages Table
CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'achievement')),
  
  -- For replies
  reply_to_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_is_private ON public.rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_rooms_tags ON public.rooms USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_status ON public.room_members(status);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON public.room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_user ON public.room_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created ON public.room_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Rooms
CREATE POLICY "rooms_select_public" ON public.rooms 
  FOR SELECT USING (NOT is_private OR host_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.room_members WHERE room_id = rooms.id AND user_id = auth.uid()
  ));

CREATE POLICY "rooms_insert_authenticated" ON public.rooms 
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "rooms_update_host" ON public.rooms 
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "rooms_delete_host" ON public.rooms 
  FOR DELETE USING (auth.uid() = host_id);

-- RLS Policies for Room Members
CREATE POLICY "room_members_select" ON public.room_members 
  FOR SELECT USING (true); -- Anyone can see who's in a room

CREATE POLICY "room_members_insert" ON public.room_members 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "room_members_update_own" ON public.room_members 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "room_members_delete_own" ON public.room_members 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Room Messages
CREATE POLICY "room_messages_select" ON public.room_messages 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.room_members WHERE room_id = room_messages.room_id AND user_id = auth.uid()
  ));

CREATE POLICY "room_messages_insert" ON public.room_messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.room_members WHERE room_id = room_messages.room_id AND user_id = auth.uid()
  ));

CREATE POLICY "room_messages_update_own" ON public.room_messages 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "room_messages_delete_own" ON public.room_messages 
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS room_messages_updated_at ON public.room_messages;
CREATE TRIGGER room_messages_updated_at
  BEFORE UPDATE ON public.room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
