'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Activity, Calendar, Clock, Flame, Target, Users, Zap } from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'

type ActivityItem = {
  id: string
  type: string
  message: string
  timestamp: string
  isPublic: boolean
}

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'session_completed', label: 'Sessions' },
  { value: 'room_joined', label: 'Room Joined' },
  { value: 'room_created', label: 'Room Created' },
  { value: 'streak_milestone', label: 'Streaks' },
  { value: 'level_up', label: 'Level Ups' },
  { value: 'achievement_earned', label: 'Achievements' },
]

const rangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

function iconForType(type: string) {
  if (type === 'session_completed') return <Target className="h-4 w-4 text-primary" />
  if (type === 'room_joined' || type === 'room_created') return <Users className="h-4 w-4 text-blue-500" />
  if (type === 'streak_milestone') return <Flame className="h-4 w-4 text-orange-500" />
  if (type === 'level_up') return <Zap className="h-4 w-4 text-yellow-500" />
  return <Activity className="h-4 w-4 text-muted-foreground" />
}

export default function ActivityPage() {
  const [type, setType] = useState('all')
  const [range, setRange] = useState('30d')
  const [items, setItems] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/activity-feed?type=${type}&range=${range}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        setError(payload?.error ?? 'Unable to load activity feed')
        setItems([])
        return
      }

      setError(null)
      setItems(payload.items ?? [])
    }

    void load()
  }, [type, range])

  const groupedByDay = useMemo(() => {
    return items.reduce<Record<string, ActivityItem[]>>((acc, item) => {
      const day = new Date(item.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
      if (!acc[day]) acc[day] = []
      acc[day].push(item)
      return acc
    }, {})
  }, [items])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Activity Feed</h1>
          <p className="text-muted-foreground">Track your real study history and milestones</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]">
              <Activity className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {Object.keys(groupedByDay).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No activity found for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByDay).map(([day, dayItems]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-base">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {iconForType(item.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.message}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                    {item.isPublic ? (
                      <Badge variant="outline" className="text-xs">Public</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Private</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Activity updates automatically as you complete sessions and join/create rooms.
      </div>
    </div>
  )
}
