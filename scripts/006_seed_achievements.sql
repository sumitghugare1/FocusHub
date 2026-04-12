-- FocusHub Database Schema: Seed Data for Achievements
-- Default achievements that users can earn

INSERT INTO public.achievements (name, description, icon, category, rarity, xp_reward, requirements, display_order) VALUES

-- Getting Started Achievements
('First Focus', 'Complete your first focus session', 'play', 'milestone', 'common', 50, '{"total_sessions": 1}'::jsonb, 1),
('Getting Started', 'Complete 5 focus sessions', 'star', 'milestone', 'common', 100, '{"total_sessions": 5}'::jsonb, 2),
('Dedicated Learner', 'Complete 25 focus sessions', 'book', 'milestone', 'uncommon', 250, '{"total_sessions": 25}'::jsonb, 3),
('Focus Master', 'Complete 100 focus sessions', 'award', 'milestone', 'rare', 500, '{"total_sessions": 100}'::jsonb, 4),
('Focus Legend', 'Complete 500 focus sessions', 'trophy', 'milestone', 'epic', 1000, '{"total_sessions": 500}'::jsonb, 5),

-- Time-based Achievements
('Hour of Power', 'Accumulate 1 hour of focus time', 'clock', 'time', 'common', 75, '{"total_minutes": 60}'::jsonb, 10),
('Half Day Hero', 'Accumulate 12 hours of focus time', 'sun', 'time', 'uncommon', 200, '{"total_minutes": 720}'::jsonb, 11),
('Full Day Focus', 'Accumulate 24 hours of focus time', 'moon', 'time', 'rare', 400, '{"total_minutes": 1440}'::jsonb, 12),
('Week Warrior', 'Accumulate 168 hours of focus time', 'calendar', 'time', 'epic', 1000, '{"total_minutes": 10080}'::jsonb, 13),
('Time Lord', 'Accumulate 1000 hours of focus time', 'hourglass', 'time', 'legendary', 5000, '{"total_minutes": 60000}'::jsonb, 14),

-- Streak Achievements
('Consistency is Key', 'Maintain a 3-day streak', 'flame', 'streak', 'common', 100, '{"streak_days": 3}'::jsonb, 20),
('Week Streak', 'Maintain a 7-day streak', 'zap', 'streak', 'uncommon', 250, '{"streak_days": 7}'::jsonb, 21),
('Two Week Warrior', 'Maintain a 14-day streak', 'target', 'streak', 'rare', 500, '{"streak_days": 14}'::jsonb, 22),
('Month Master', 'Maintain a 30-day streak', 'crown', 'streak', 'epic', 1000, '{"streak_days": 30}'::jsonb, 23),
('Unstoppable', 'Maintain a 100-day streak', 'rocket', 'streak', 'legendary', 3000, '{"streak_days": 100}'::jsonb, 24),

-- Social Achievements
('Room Creator', 'Create your first study room', 'home', 'social', 'common', 100, '{"rooms_created": 1}'::jsonb, 30),
('Team Player', 'Join 5 different study rooms', 'users', 'social', 'common', 100, '{"rooms_joined": 5}'::jsonb, 31),
('Community Builder', 'Have 10 members in your room', 'building', 'social', 'uncommon', 250, '{"room_members": 10}'::jsonb, 32),
('Study Buddy', 'Add your first friend', 'heart', 'social', 'common', 75, '{"friends_count": 1}'::jsonb, 33),
('Social Butterfly', 'Have 10 friends', 'sparkles', 'social', 'rare', 300, '{"friends_count": 10}'::jsonb, 34),

-- Special Achievements
('Early Bird', 'Complete a session before 7 AM', 'sunrise', 'special', 'uncommon', 150, '{"session_before_hour": 7}'::jsonb, 40),
('Night Owl', 'Complete a session after 11 PM', 'moon', 'special', 'uncommon', 150, '{"session_after_hour": 23}'::jsonb, 41),
('Weekend Warrior', 'Complete 5 sessions on a weekend', 'coffee', 'special', 'uncommon', 200, '{"weekend_sessions": 5}'::jsonb, 42),
('Marathon Session', 'Complete a 2-hour focus session', 'timer', 'special', 'rare', 300, '{"session_minutes": 120}'::jsonb, 43),
('Perfect Week', 'Study every day for a week', 'check-circle', 'special', 'rare', 400, '{"consecutive_days": 7}'::jsonb, 44),

-- Level Achievements
('Level 5', 'Reach level 5', 'trending-up', 'milestone', 'common', 100, '{"level": 5}'::jsonb, 50),
('Level 10', 'Reach level 10', 'trending-up', 'milestone', 'uncommon', 200, '{"level": 10}'::jsonb, 51),
('Level 25', 'Reach level 25', 'trending-up', 'milestone', 'rare', 500, '{"level": 25}'::jsonb, 52),
('Level 50', 'Reach level 50', 'trending-up', 'milestone', 'epic', 1000, '{"level": 50}'::jsonb, 53),
('Level 100', 'Reach level 100', 'trending-up', 'milestone', 'legendary', 2500, '{"level": 100}'::jsonb, 54)

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  rarity = EXCLUDED.rarity,
  xp_reward = EXCLUDED.xp_reward,
  requirements = EXCLUDED.requirements,
  display_order = EXCLUDED.display_order;
