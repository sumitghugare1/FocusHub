'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/use-current-user'

const tabs = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all-time', label: 'All Time' },
]

type LeaderboardEntry = {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalMinutes: number
  streak: number
  level: number
}

function formatMinutesToHours(minutes: number) {
  if (minutes <= 0) return '0h'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours <= 0) return `${mins}m`
  if (mins <= 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function LeaderboardPage() {
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState('weekly')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadLeaderboard = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/leaderboard?period=${activeTab}&limit=100`, {
          cache: 'no-store',
        })

        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load leaderboard')
        }

        if (!cancelled) {
          setEntries(payload.entries ?? [])
          setCurrentUserRank(payload.currentUserRank ?? 0)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
          setEntries([])
          setCurrentUserRank(0)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadLeaderboard()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  const topThree = useMemo(() => entries.slice(0, 3), [entries])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    }
  }

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30'
      case 2:
        return 'bg-gray-400/10 border-gray-400/30'
      case 3:
        return 'bg-amber-600/10 border-amber-600/30'
      default:
        return ''
    }
  }

  const topSecond = topThree.find((entry) => entry.rank === 2)
  const topFirst = topThree.find((entry) => entry.rank === 1)
  const topThird = topThree.find((entry) => entry.rank === 3)

  const showYouBadge = (entryUserId: string) => Boolean(currentUser.id && entryUserId === currentUser.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Leaderboard</h1>
          <p className="text-muted-foreground">See how you rank among other students</p>
        </div>
        <Badge variant="outline" className="w-fit">
          Your Rank: {isUserLoading ? '...' : currentUserRank > 0 ? `#${currentUserRank}` : 'Unranked'}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {error ? (
            <Card>
              <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : null}

          {isLoading ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">Loading leaderboard...</CardContent>
            </Card>
          ) : null}

          {/* Top 3 Showcase */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Second Place */}
            <Card className={cn('order-2 md:order-1', getRankBackground(2))}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  <Medal className="h-8 w-8 text-gray-400" />
                </div>
                <Avatar className="mx-auto h-16 w-16 border-4 border-gray-400/30">
                  <AvatarImage src={topSecond?.userAvatar} />
                  <AvatarFallback>{topSecond?.userName.slice(0, 2).toUpperCase() || '--'}</AvatarFallback>
                </Avatar>
                <h3 className="mt-3 font-semibold text-foreground">{topSecond?.userName || '---'}</h3>
                <p className="text-sm text-muted-foreground">Level {topSecond?.level ?? 0}</p>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-foreground">
                      {formatMinutesToHours(topSecond?.totalMinutes || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Study Time</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground flex items-center justify-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {topSecond?.streak ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* First Place */}
            <Card className={cn('order-1 md:order-2 md:scale-105', getRankBackground(1))}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  <Crown className="h-10 w-10 text-yellow-500" />
                </div>
                <Avatar className="mx-auto h-20 w-20 border-4 border-yellow-500/50">
                  <AvatarImage src={topFirst?.userAvatar} />
                  <AvatarFallback>{topFirst?.userName.slice(0, 2).toUpperCase() || '--'}</AvatarFallback>
                </Avatar>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{topFirst?.userName || '---'}</h3>
                <p className="text-sm text-muted-foreground">Level {topFirst?.level ?? 0}</p>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">
                      {formatMinutesToHours(topFirst?.totalMinutes || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Study Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {topFirst?.streak ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third Place */}
            <Card className={cn('order-3', getRankBackground(3))}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  <Medal className="h-8 w-8 text-amber-600" />
                </div>
                <Avatar className="mx-auto h-16 w-16 border-4 border-amber-600/30">
                  <AvatarImage src={topThird?.userAvatar} />
                  <AvatarFallback>{topThird?.userName.slice(0, 2).toUpperCase() || '--'}</AvatarFallback>
                </Avatar>
                <h3 className="mt-3 font-semibold text-foreground">{topThird?.userName || '---'}</h3>
                <p className="text-sm text-muted-foreground">Level {topThird?.level ?? 0}</p>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-foreground">
                      {formatMinutesToHours(topThird?.totalMinutes || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Study Time</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground flex items-center justify-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {topThird?.streak ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Full Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.userId}
                    className={cn(
                      'flex items-center gap-4 rounded-lg p-3 transition-colors',
                      showYouBadge(entry.userId)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50',
                      entry.rank <= 3 && getRankBackground(entry.rank)
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.userAvatar} />
                      <AvatarFallback>{entry.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {entry.userName}
                        </p>
                        {showYouBadge(entry.userId) && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Level {entry.level}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center w-20">
                        <p className="font-medium text-foreground flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatMinutesToHours(entry.totalMinutes)}
                        </p>
                      </div>
                      <div className="text-center w-16">
                        <p className="font-medium text-foreground flex items-center justify-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {entry.streak}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {!isLoading && entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No leaderboard data yet for this period.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
