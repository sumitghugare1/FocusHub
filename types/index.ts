// User Types
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt: string
  totalStudyTime: number // in minutes
  currentStreak: number // in days
  longestStreak: number
  sessionsCompleted: number
  level: number
  xp: number
  badges: Badge[]
  status: 'online' | 'studying' | 'on-break' | 'offline'
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
}

// Study Room Types
export interface StudyRoom {
  id: string
  name: string
  description?: string
  topic: string
  hostId: string
  hostName: string
  participants: Participant[]
  maxParticipants: number
  isPrivate: boolean
  password?: string
  status: 'active' | 'on-break' | 'inactive'
  createdAt: string
  currentSession?: PomodoroSession
}

export interface Participant {
  id: string
  name: string
  avatar?: string
  status: 'focusing' | 'on-break' | 'idle'
  joinedAt: string
}

// Pomodoro Types
export interface PomodoroSession {
  id: string
  userId: string
  roomId?: string
  type: 'focus' | 'short-break' | 'long-break'
  duration: number // in minutes
  startedAt: string
  endedAt?: string
  completed: boolean
}

export interface TimerSettings {
  focusDuration: number // in minutes
  shortBreakDuration: number
  longBreakDuration: number
  sessionsBeforeLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
}

// Analytics Types
export interface DailyStats {
  date: string
  totalMinutes: number
  sessionsCompleted: number
  focusScore: number // 0-100
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  sessionsCompleted: number
  averageFocusScore: number
  dailyBreakdown: DailyStats[]
}

// Chat Types
export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp: string
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalMinutes: number
  streak: number
  level: number
}

// Admin Types
export interface PlatformStats {
  totalUsers: number
  activeUsers: number
  totalRooms: number
  activeRooms: number
  totalSessions: number
  totalStudyMinutes: number
  userGrowth: { date: string; count: number }[]
  peakHours: { hour: number; sessions: number }[]
}

// Activity Types
export interface Activity {
  id: string
  type: 'session_completed' | 'badge_earned' | 'streak_milestone' | 'room_joined' | 'level_up'
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// Navigation Types
export interface NavItem {
  title: string
  href: string
  icon: string
  badge?: string | number
}
