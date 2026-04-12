import type {
  User,
  StudyRoom,
  DailyStats,
  LeaderboardEntry,
  ChatMessage,
  Activity,
  PlatformStats,
  TimerSettings,
  Badge,
} from '@/types'

// Current User
export const currentUser: User = {
  id: 'user-1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: '/avatars/alex.jpg',
  role: 'user',
  createdAt: '2024-01-15T10:00:00Z',
  totalStudyTime: 4320, // 72 hours
  currentStreak: 12,
  longestStreak: 28,
  sessionsCompleted: 156,
  level: 15,
  xp: 7850,
  badges: [
    {
      id: 'badge-1',
      name: 'Early Bird',
      description: 'Complete 5 sessions before 8 AM',
      icon: 'sunrise',
      earnedAt: '2024-02-10T06:30:00Z',
    },
    {
      id: 'badge-2',
      name: 'Focus Master',
      description: 'Complete 100 focus sessions',
      icon: 'target',
      earnedAt: '2024-03-05T14:20:00Z',
    },
    {
      id: 'badge-3',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: 'flame',
      earnedAt: '2024-02-20T18:00:00Z',
    },
  ],
  status: 'online',
}

// Sample Users for leaderboard and rooms
export const sampleUsers: User[] = [
  currentUser,
  {
    id: 'user-2',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatar: '/avatars/sarah.jpg',
    role: 'user',
    createdAt: '2024-01-10T08:00:00Z',
    totalStudyTime: 5280,
    currentStreak: 21,
    longestStreak: 35,
    sessionsCompleted: 198,
    level: 18,
    xp: 9200,
    badges: [],
    status: 'studying',
  },
  {
    id: 'user-3',
    name: 'Mike Rodriguez',
    email: 'mike@example.com',
    avatar: '/avatars/mike.jpg',
    role: 'user',
    createdAt: '2024-02-01T12:00:00Z',
    totalStudyTime: 3150,
    currentStreak: 8,
    longestStreak: 15,
    sessionsCompleted: 112,
    level: 12,
    xp: 5600,
    badges: [],
    status: 'on-break',
  },
  {
    id: 'user-4',
    name: 'Emma Wilson',
    email: 'emma@example.com',
    role: 'user',
    createdAt: '2024-01-25T09:00:00Z',
    totalStudyTime: 6720,
    currentStreak: 45,
    longestStreak: 45,
    sessionsCompleted: 245,
    level: 22,
    xp: 12400,
    badges: [],
    status: 'studying',
  },
  {
    id: 'user-5',
    name: 'James Park',
    email: 'james@example.com',
    avatar: '/avatars/james.jpg',
    role: 'user',
    createdAt: '2024-02-15T14:00:00Z',
    totalStudyTime: 2880,
    currentStreak: 5,
    longestStreak: 12,
    sessionsCompleted: 95,
    level: 10,
    xp: 4200,
    badges: [],
    status: 'offline',
  },
]

// Study Rooms
export const studyRooms: StudyRoom[] = [
  {
    id: 'room-1',
    name: 'Deep Work Zone',
    description: 'For serious focused work. No distractions!',
    topic: 'General Study',
    hostId: 'user-2',
    hostName: 'Sarah Chen',
    participants: [
      { id: 'user-2', name: 'Sarah Chen', avatar: '/avatars/sarah.jpg', status: 'focusing', joinedAt: '2024-03-20T08:00:00Z' },
      { id: 'user-4', name: 'Emma Wilson', status: 'focusing', joinedAt: '2024-03-20T08:15:00Z' },
      { id: 'user-3', name: 'Mike Rodriguez', avatar: '/avatars/mike.jpg', status: 'on-break', joinedAt: '2024-03-20T08:30:00Z' },
    ],
    maxParticipants: 10,
    isPrivate: false,
    status: 'active',
    createdAt: '2024-03-20T08:00:00Z',
  },
  {
    id: 'room-2',
    name: 'CS Study Group',
    description: 'Computer Science majors unite!',
    topic: 'Computer Science',
    hostId: 'user-4',
    hostName: 'Emma Wilson',
    participants: [
      { id: 'user-4', name: 'Emma Wilson', status: 'focusing', joinedAt: '2024-03-20T09:00:00Z' },
      { id: 'user-5', name: 'James Park', avatar: '/avatars/james.jpg', status: 'idle', joinedAt: '2024-03-20T09:10:00Z' },
    ],
    maxParticipants: 8,
    isPrivate: false,
    status: 'active',
    createdAt: '2024-03-20T09:00:00Z',
  },
  {
    id: 'room-3',
    name: 'Exam Prep - Math',
    description: 'Preparing for calculus finals',
    topic: 'Mathematics',
    hostId: 'user-3',
    hostName: 'Mike Rodriguez',
    participants: [
      { id: 'user-3', name: 'Mike Rodriguez', avatar: '/avatars/mike.jpg', status: 'on-break', joinedAt: '2024-03-20T10:00:00Z' },
    ],
    maxParticipants: 6,
    isPrivate: true,
    status: 'on-break',
    createdAt: '2024-03-20T10:00:00Z',
  },
  {
    id: 'room-4',
    name: 'Language Learning',
    description: 'Practice and study languages together',
    topic: 'Languages',
    hostId: 'user-1',
    hostName: 'Alex Johnson',
    participants: [
      { id: 'user-1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', status: 'idle', joinedAt: '2024-03-20T11:00:00Z' },
    ],
    maxParticipants: 12,
    isPrivate: false,
    status: 'inactive',
    createdAt: '2024-03-20T11:00:00Z',
  },
]

// Daily Stats for Analytics (last 30 days)
export const dailyStats: DailyStats[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const baseMinutes = isWeekend ? 60 : 120
  const variance = Math.floor(Math.random() * 60) - 30
  
  return {
    date: date.toISOString().split('T')[0],
    totalMinutes: Math.max(0, baseMinutes + variance),
    sessionsCompleted: Math.floor((baseMinutes + variance) / 25),
    focusScore: Math.min(100, Math.max(50, 75 + Math.floor(Math.random() * 30) - 15)),
  }
})

// Leaderboard Data
export const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, userId: 'user-4', userName: 'Emma Wilson', totalMinutes: 6720, streak: 45, level: 22 },
  { rank: 2, userId: 'user-2', userName: 'Sarah Chen', userAvatar: '/avatars/sarah.jpg', totalMinutes: 5280, streak: 21, level: 18 },
  { rank: 3, userId: 'user-1', userName: 'Alex Johnson', userAvatar: '/avatars/alex.jpg', totalMinutes: 4320, streak: 12, level: 15 },
  { rank: 4, userId: 'user-3', userName: 'Mike Rodriguez', userAvatar: '/avatars/mike.jpg', totalMinutes: 3150, streak: 8, level: 12 },
  { rank: 5, userId: 'user-5', userName: 'James Park', userAvatar: '/avatars/james.jpg', totalMinutes: 2880, streak: 5, level: 10 },
  { rank: 6, userId: 'user-6', userName: 'Lisa Thompson', totalMinutes: 2640, streak: 14, level: 11 },
  { rank: 7, userId: 'user-7', userName: 'David Kim', totalMinutes: 2400, streak: 7, level: 9 },
  { rank: 8, userId: 'user-8', userName: 'Rachel Green', totalMinutes: 2160, streak: 3, level: 8 },
  { rank: 9, userId: 'user-9', userName: 'Tom Anderson', totalMinutes: 1920, streak: 10, level: 8 },
  { rank: 10, userId: 'user-10', userName: 'Nina Patel', totalMinutes: 1680, streak: 6, level: 7 },
]

// Chat Messages
export const chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    roomId: 'room-1',
    userId: 'user-2',
    userName: 'Sarah Chen',
    userAvatar: '/avatars/sarah.jpg',
    content: 'Starting a new focus session! Let\'s crush it!',
    timestamp: '2024-03-20T08:05:00Z',
  },
  {
    id: 'msg-2',
    roomId: 'room-1',
    userId: 'user-4',
    userName: 'Emma Wilson',
    content: 'Good luck everyone!',
    timestamp: '2024-03-20T08:06:00Z',
  },
  {
    id: 'msg-3',
    roomId: 'room-1',
    userId: 'user-3',
    userName: 'Mike Rodriguez',
    userAvatar: '/avatars/mike.jpg',
    content: 'Taking a quick break, back in 5!',
    timestamp: '2024-03-20T08:30:00Z',
  },
]

// Recent Activity
export const recentActivity: Activity[] = [
  {
    id: 'activity-1',
    type: 'session_completed',
    message: 'Completed a 25-minute focus session',
    timestamp: '2024-03-20T10:30:00Z',
  },
  {
    id: 'activity-2',
    type: 'streak_milestone',
    message: 'Reached a 12-day study streak!',
    timestamp: '2024-03-20T09:00:00Z',
  },
  {
    id: 'activity-3',
    type: 'badge_earned',
    message: 'Earned the "Focus Master" badge',
    timestamp: '2024-03-19T18:00:00Z',
  },
  {
    id: 'activity-4',
    type: 'room_joined',
    message: 'Joined "Deep Work Zone" study room',
    timestamp: '2024-03-19T14:00:00Z',
  },
  {
    id: 'activity-5',
    type: 'level_up',
    message: 'Leveled up to Level 15!',
    timestamp: '2024-03-18T20:00:00Z',
  },
]

// Default Timer Settings
export const defaultTimerSettings: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  notificationsEnabled: true,
}

// Platform Stats for Admin
export const platformStats: PlatformStats = {
  totalUsers: 12458,
  activeUsers: 3421,
  totalRooms: 856,
  activeRooms: 124,
  totalSessions: 458920,
  totalStudyMinutes: 11473000,
  userGrowth: Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (11 - i))
    return {
      date: date.toISOString().slice(0, 7),
      count: 800 + Math.floor(Math.random() * 400) + (i * 150),
    }
  }),
  peakHours: Array.from({ length: 24 }, (_, hour) => {
    let sessions = 100
    if (hour >= 9 && hour <= 12) sessions = 400 + Math.floor(Math.random() * 200)
    else if (hour >= 14 && hour <= 17) sessions = 500 + Math.floor(Math.random() * 250)
    else if (hour >= 19 && hour <= 22) sessions = 600 + Math.floor(Math.random() * 300)
    else if (hour >= 6 && hour <= 8) sessions = 200 + Math.floor(Math.random() * 100)
    else sessions = 50 + Math.floor(Math.random() * 50)
    return { hour, sessions }
  }),
}

// Admin User List
export const adminUserList = sampleUsers.map((user, index) => ({
  ...user,
  lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  sessionsThisWeek: Math.floor(Math.random() * 20) + 5,
  status: ['online', 'studying', 'offline', 'on-break'][index % 4] as User['status'],
}))

// Available Badges
export const availableBadges: Badge[] = [
  { id: 'badge-1', name: 'Early Bird', description: 'Complete 5 sessions before 8 AM', icon: 'sunrise', earnedAt: '' },
  { id: 'badge-2', name: 'Focus Master', description: 'Complete 100 focus sessions', icon: 'target', earnedAt: '' },
  { id: 'badge-3', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', earnedAt: '' },
  { id: 'badge-4', name: 'Night Owl', description: 'Complete 5 sessions after 10 PM', icon: 'moon', earnedAt: '' },
  { id: 'badge-5', name: 'Social Studier', description: 'Join 10 study rooms', icon: 'users', earnedAt: '' },
  { id: 'badge-6', name: 'Marathon Runner', description: 'Study for 4 hours in one day', icon: 'trophy', earnedAt: '' },
  { id: 'badge-7', name: 'Consistency King', description: 'Maintain a 30-day streak', icon: 'crown', earnedAt: '' },
  { id: 'badge-8', name: 'Helper', description: 'Host 5 study rooms', icon: 'heart', earnedAt: '' },
]

// Helper function to format minutes to hours
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Helper function to format time ago
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(dateString)
}
