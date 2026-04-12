-- FocusHub Migration 010
-- Incremental updates for room access, private room join by ID/password, and API support functions.
-- Run this after scripts 001-009.

-- 1) Allow authenticated users to read room metadata.
-- Message visibility is still controlled by room_members + room_messages policies.
DROP POLICY IF EXISTS "rooms_select_public" ON public.rooms;
CREATE POLICY "rooms_select_public" ON public.rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2) Helper function for room detail access checks.
CREATE OR REPLACE FUNCTION public.get_room_access(room_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  is_private boolean,
  max_participants integer,
  status text,
  host_id uuid,
  host_name text,
  participant_count bigint,
  is_member boolean,
  requires_password boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.description,
    r.category,
    r.is_private,
    r.max_participants,
    r.status,
    r.host_id,
    COALESCE(p.full_name, p.username, 'Host') AS host_name,
    (
      SELECT count(*)
      FROM public.room_members rm
      WHERE rm.room_id = r.id
    ) AS participant_count,
    (
      r.host_id = auth.uid() OR EXISTS (
        SELECT 1
        FROM public.room_members rm
        WHERE rm.room_id = r.id
          AND rm.user_id = auth.uid()
      )
    ) AS is_member,
    (
      r.is_private AND NOT (
        r.host_id = auth.uid() OR EXISTS (
          SELECT 1
          FROM public.room_members rm
          WHERE rm.room_id = r.id
            AND rm.user_id = auth.uid()
        )
      )
    ) AS requires_password
  FROM public.rooms r
  LEFT JOIN public.profiles p ON p.id = r.host_id
  WHERE r.id = room_id;
$$;

-- 3) Helper function for robust join checks (avoids RLS-related false 404).
CREATE OR REPLACE FUNCTION public.get_room_join_access(room_id uuid)
RETURNS TABLE (
  id uuid,
  host_id uuid,
  is_private boolean,
  password_hash text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.host_id,
    r.is_private,
    r.password_hash
  FROM public.rooms r
  WHERE r.id = room_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_join_access(uuid) TO authenticated;
