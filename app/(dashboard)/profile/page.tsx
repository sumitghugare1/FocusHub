'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Edit2,
  Camera,
  Trophy,
  Flame,
  Clock,
  Target,
  Calendar,
  Award,
  Sunrise,
  Moon,
  Users,
  Crown,
  Heart,
  Zap,
} from 'lucide-react'
import { formatDate, formatMinutesToHours } from '@/lib/format'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { Badge as AppBadge } from '@/types'

const badgeIcons: Record<string, React.ReactNode> = {
  sunrise: <Sunrise className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  moon: <Moon className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
}

export default function ProfilePage() {
  const { user: currentUser } = useCurrentUser()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [availableBadges, setAvailableBadges] = useState<AppBadge[]>([])

  useEffect(() => {
    const loadAvailableBadges = async () => {
      const response = await fetch('/api/profile/badges', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        setAvailableBadges([])
        return
      }

      setAvailableBadges(payload.availableBadges ?? [])
    }

    void loadAvailableBadges()
  }, [])

  const xpProgress = (currentUser.xp % 1000) / 10
  const xpToNextLevel = 1000 - (currentUser.xp % 1000)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Profile</h1>
          <p className="text-muted-foreground">View and manage your profile</p>
        </div>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <FieldGroup className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" defaultValue={currentUser.name} />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" defaultValue={currentUser.email} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setEditDialogOpen(false)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-primary/30">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-2xl">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold text-foreground">{currentUser.name}</h2>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">
                  <Zap className="mr-1 h-3 w-3 text-primary" />
                  Level {currentUser.level}
                </Badge>
                <Badge variant="outline">
                  <Flame className="mr-1 h-3 w-3 text-orange-500" />
                  {currentUser.currentStreak} day streak
                </Badge>
              </div>

              {/* XP Progress */}
              <div className="mt-6 w-full">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">XP Progress</span>
                  <span className="text-foreground">{currentUser.xp % 1000} / 1000</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  {xpToNextLevel} XP to Level {currentUser.level + 1}
                </p>
              </div>

              {/* Member Since */}
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member since {formatDate(currentUser.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats & Badges */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {formatMinutesToHours(currentUser.totalStudyTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Study Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {currentUser.sessionsCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {currentUser.currentStreak}
                    </p>
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {currentUser.longestStreak}
                    </p>
                    <p className="text-xs text-muted-foreground">Best Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Earned Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Earned Badges ({currentUser.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentUser.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {badgeIcons[badge.icon] || <Award className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" />
                Badges to Earn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableBadges
                  .filter((badge) => !currentUser.badges.some((b) => b.id === badge.id))
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3 opacity-60"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {badgeIcons[badge.icon] || <Award className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
