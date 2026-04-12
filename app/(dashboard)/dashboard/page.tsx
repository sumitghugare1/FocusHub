import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Timer,
  Users,
  Plus,
  Flame,
  Clock,
  Target,
  TrendingUp,
  ArrowRight,
  Play,
  Trophy,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import {
  currentUser as mockCurrentUser,
  formatMinutesToHours,
  formatTimeAgo,
} from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'
import { toAppUser } from '@/lib/auth/current-user'
import { WeeklyGoalEditor } from '@/components/dashboard/weekly-goal-editor'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let currentUser = mockCurrentUser

  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('earned_at, achievements(id, name, description, icon)')
      .eq('user_id', authUser.id)
      .order('earned_at', { ascending: false })

    currentUser = toAppUser({
      authUser,
      profile,
      badges:
        userAchievements?.map((item) => ({
          earned_at: item.earned_at,
          achievement: Array.isArray(item.achievements)
            ? item.achievements[0] ?? null
            : item.achievements,
        })) ?? [],
    })
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const weekStart = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  })()

  const [{ data: todayStats }, { data: weeklyGoal }, { data: activeRoomsRaw }, { data: members }, { data: recentActivity }] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('total_focus_minutes, completed_sessions')
      .eq('user_id', authUser?.id ?? '')
      .eq('date', todayIso)
      .maybeSingle(),
    supabase
      .from('weekly_goals')
      .select('progress_percentage, target_focus_hours, achieved_focus_hours')
      .eq('user_id', authUser?.id ?? '')
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase
      .from('rooms')
      .select('id, name, category, status, max_participants, host_id, profiles:host_id(full_name, username)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('room_members').select('room_id, user_id'),
    supabase
      .from('activity_feed')
      .select('id, type, description, created_at')
      .eq('user_id', authUser?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const recentActivityList = (recentActivity ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    message: item.description,
    timestamp: item.created_at,
  }))

  const memberCountByRoom = (members ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.room_id] = (acc[item.room_id] ?? 0) + 1
    return acc
  }, {})

  const activeRooms = (activeRoomsRaw ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    topic: room.category,
    status: room.status,
    hostName:
      (Array.isArray(room.profiles) ? room.profiles[0]?.full_name : room.profiles?.full_name) ||
      (Array.isArray(room.profiles) ? room.profiles[0]?.username : room.profiles?.username) ||
      'Host',
    participantCount: memberCountByRoom[room.id] ?? 0,
  }))

  const quickStats = [
    {
      title: 'Today&apos;s Study Time',
      value: formatMinutesToHours(todayStats?.total_focus_minutes ?? 0),
      change: 'Tracked from completed sessions',
      icon: Clock,
      trend: 'up',
    },
    {
      title: 'Current Streak',
      value: `${currentUser.currentStreak} days`,
      change: 'Keep it going!',
      icon: Flame,
      trend: 'up',
    },
    {
      title: 'Sessions Today',
      value: String(todayStats?.completed_sessions ?? 0),
      change: 'Completed focus sessions',
      icon: Target,
      trend: 'neutral',
    },
    {
      title: 'Weekly Progress',
      value: `${weeklyGoal?.progress_percentage ?? 0}%`,
      change: `Goal: ${weeklyGoal?.target_focus_hours ?? 20} hours`,
      icon: TrendingUp,
      trend: 'up',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Welcome back, {currentUser.name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Ready to focus? Your streak is on fire!
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/rooms">
              <Users className="mr-2 h-4 w-4" />
              Join Room
            </Link>
          </Button>
          <Button asChild>
            <Link href="/timer">
              <Play className="mr-2 h-4 w-4" />
              Start Focus
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend === 'up' && (
                  <Badge variant="secondary" className="text-green-500 bg-green-500/10">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Up
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Start Timer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Quick Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {/* Timer Display */}
              <div className="relative h-40 w-40">
                <svg className="h-full w-full -rotate-90 transform">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={440}
                    strokeDashoffset={110}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">25:00</span>
                  <span className="text-sm text-muted-foreground">Focus</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button size="lg" asChild>
                  <Link href="/timer">
                    <Play className="mr-2 h-4 w-4" />
                    Start Session
                  </Link>
                </Button>
              </div>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Session 1 of 4 today
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Study Rooms */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Active Study Rooms
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/rooms">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{room.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{room.topic}</span>
                        <span>-</span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {room.participantCount} studying
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Host: {room.hostName}</Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/rooms/${room.id}`}>Join</Link>
                    </Button>
                  </div>
                </div>
              ))}

              {/* Create Room CTA */}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/rooms">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Room
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivityList.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {activity.type === 'session_completed' && (
                      <Timer className="h-5 w-5 text-primary" />
                    )}
                    {activity.type === 'streak_milestone' && (
                      <Flame className="h-5 w-5 text-orange-500" />
                    )}
                    {activity.type === 'badge_earned' && (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    )}
                    {activity.type === 'room_joined' && (
                      <Users className="h-5 w-5 text-blue-500" />
                    )}
                    {activity.type === 'level_up' && (
                      <Zap className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress & Level */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Level Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Level {currentUser.level}</span>
                <span className="text-sm text-muted-foreground">
                  {currentUser.xp % 1000} / 1000 XP
                </span>
              </div>
              <Progress value={(currentUser.xp % 1000) / 10} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {1000 - (currentUser.xp % 1000)} XP to Level {currentUser.level + 1}
              </p>
            </div>

            {/* Stats Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground">Total Study Time</span>
                <span className="font-medium text-foreground">
                  {formatMinutesToHours(currentUser.totalStudyTime)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground">Sessions Completed</span>
                <span className="font-medium text-foreground">{currentUser.sessionsCompleted}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground">Longest Streak</span>
                <span className="font-medium text-foreground">{currentUser.longestStreak} days</span>
              </div>
            </div>

            {/* Recent Badges */}
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Recent Badges</p>
              <div className="flex flex-wrap gap-2">
                {currentUser.badges.slice(0, 3).map((badge) => (
                  <Badge key={badge.id} variant="secondary" className="gap-1">
                    {badge.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/profile">View Full Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <WeeklyGoalEditor />
    </div>
  )
}
