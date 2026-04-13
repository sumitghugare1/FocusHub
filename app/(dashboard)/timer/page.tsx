'use client'

import { useState, useEffect, useCallback } from 'react'
import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  Volume2,
  VolumeX,
  Coffee,
  Brain,
  Flame,
  Target,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultTimerSettings } from '@/lib/constants/timer-settings'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentUser } from '@/hooks/use-current-user'

type TimerMode = 'focus' | 'short-break' | 'long-break'

interface TimerState {
  mode: TimerMode
  timeRemaining: number // in seconds
  isRunning: boolean
  currentSession: number
  totalSessions: number
}

interface PersistedTimerState extends TimerState {
  savedAt: string
}

const TIMER_STORAGE_KEY = 'focushub_timer_state_v1'

function restoreTimerFromPersisted(parsed: PersistedTimerState): TimerState {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(parsed.savedAt).getTime()) / 1000),
  )

  const restoredRemaining = parsed.isRunning
    ? Math.max(0, parsed.timeRemaining - elapsedSeconds)
    : parsed.timeRemaining

  return {
    mode: parsed.mode,
    timeRemaining: restoredRemaining,
    isRunning: parsed.isRunning && restoredRemaining > 0,
    currentSession: parsed.currentSession,
    totalSessions: parsed.totalSessions,
  }
}

export default function TimerPage() {
  const { user: currentUser, refresh: refreshCurrentUser } = useCurrentUser()
  const [settings, setSettings] = useState(defaultTimerSettings)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [hasLoadedTimerSettings, setHasLoadedTimerSettings] = useState(false)
  const [todayStats, setTodayStats] = useState({
    focusMinutes: 0,
    completedSessions: 0,
  })
  const [dailyGoal, setDailyGoal] = useState({ targetFocusHours: 4, targetSessions: 8 })
  const [dailyGoalDraft, setDailyGoalDraft] = useState({ targetFocusHours: 4, targetSessions: 8 })
  const [dailyGoalError, setDailyGoalError] = useState<string | null>(null)
  const [isSavingDailyGoal, setIsSavingDailyGoal] = useState(false)
  const [timer, setTimer] = useState<TimerState>({
    mode: 'focus',
    timeRemaining: settings.focusDuration * 60,
    isRunning: false,
    currentSession: 1,
    totalSessions: settings.sessionsBeforeLongBreak,
  })
  const [hasLoadedPersistedTimer, setHasLoadedPersistedTimer] = useState(false)

  const loadOverview = useCallback(async () => {
    const response = await fetch('/api/stats/overview', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      return
    }

    setTodayStats({
      focusMinutes: payload.today?.focusMinutes ?? 0,
      completedSessions: payload.today?.completedSessions ?? 0,
    })
  }, [])

  const loadDailyGoal = useCallback(async () => {
    const response = await fetch('/api/daily-goals', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success || !payload?.dailyGoal) {
      return
    }

    const next = {
      targetFocusHours: payload.dailyGoal.targetFocusHours,
      targetSessions: payload.dailyGoal.targetSessions,
    }
    setDailyGoal(next)
    setDailyGoalDraft(next)
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadDailyGoal()
  }, [loadDailyGoal])

  const saveDailyGoal = useCallback(async () => {
    setIsSavingDailyGoal(true)
    setDailyGoalError(null)

    const response = await fetch('/api/daily-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dailyGoalDraft),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setDailyGoalError(payload?.error ?? 'Unable to save daily goal')
      setIsSavingDailyGoal(false)
      return
    }

    setDailyGoal(dailyGoalDraft)
    setIsSavingDailyGoal(false)
  }, [dailyGoalDraft])

  useEffect(() => {
    const loadTimerSettings = async () => {
      const response = await fetch('/api/timer-settings', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success || !payload?.timer) {
        setHasLoadedTimerSettings(true)
        return
      }

      setSettings((prev) => ({
        ...prev,
        focusDuration: payload.timer.focusDuration,
        shortBreakDuration: payload.timer.shortBreakDuration,
        longBreakDuration: payload.timer.longBreakDuration,
        sessionsBeforeLongBreak: payload.timer.sessionsBeforeLongBreak,
        autoStartBreaks: payload.timer.autoStartBreaks,
        autoStartPomodoros: payload.timer.autoStartPomodoros,
        soundEnabled: payload.timer.soundEnabled,
      }))
      setSoundEnabled(Boolean(payload.timer.soundEnabled))
      setHasLoadedTimerSettings(true)
    }

    void loadTimerSettings()
  }, [])

  useEffect(() => {
    if (!hasLoadedTimerSettings) return

    const timeout = window.setTimeout(() => {
      void fetch('/api/timer-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusDuration: settings.focusDuration,
          shortBreakDuration: settings.shortBreakDuration,
          longBreakDuration: settings.longBreakDuration,
          sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
          autoStartBreaks: settings.autoStartBreaks,
          autoStartPomodoros: settings.autoStartPomodoros,
          soundEnabled,
        }),
      })
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [
    hasLoadedTimerSettings,
    settings.focusDuration,
    settings.shortBreakDuration,
    settings.longBreakDuration,
    settings.sessionsBeforeLongBreak,
    settings.autoStartBreaks,
    settings.autoStartPomodoros,
    soundEnabled,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) {
      setHasLoadedPersistedTimer(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as PersistedTimerState
      setTimer(restoreTimerFromPersisted(parsed))
    } catch {
      window.localStorage.removeItem(TIMER_STORAGE_KEY)
    } finally {
      setHasLoadedPersistedTimer(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TIMER_STORAGE_KEY || !event.newValue) return

      try {
        const parsed = JSON.parse(event.newValue) as PersistedTimerState
        setTimer(restoreTimerFromPersisted(parsed))
      } catch {
        // Ignore malformed cross-tab payloads.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!hasLoadedPersistedTimer || typeof window === 'undefined') return

    const payload: PersistedTimerState = {
      ...timer,
      savedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload))
  }, [timer, hasLoadedPersistedTimer])

  const getDurationForMode = useCallback((mode: TimerMode) => {
    switch (mode) {
      case 'focus':
        return settings.focusDuration * 60
      case 'short-break':
        return settings.shortBreakDuration * 60
      case 'long-break':
        return settings.longBreakDuration * 60
    }
  }, [settings.focusDuration, settings.shortBreakDuration, settings.longBreakDuration])

  useEffect(() => {
    if (!hasLoadedPersistedTimer) return

    let interval: NodeJS.Timeout | null = null

    if (timer.isRunning && timer.timeRemaining > 0) {
      interval = setInterval(() => {
        setTimer((prev) => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }))
      }, 1000)
    } else if (timer.timeRemaining === 0 && timer.isRunning) {
      // Timer completed
      handleTimerComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timer.isRunning, timer.timeRemaining, hasLoadedPersistedTimer])

  const persistSession = useCallback(async (mode: TimerMode) => {
    const sessionType = mode === 'focus' ? 'focus' : mode === 'short-break' ? 'short_break' : 'long_break'
    const plannedDuration = Math.floor(getDurationForMode(mode) / 60)

    await fetch('/api/focus-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionType,
        plannedDuration,
        actualDuration: plannedDuration,
        status: 'completed',
      }),
    })

    await refreshCurrentUser()
    window.dispatchEvent(new CustomEvent('focushub:user-refresh'))
    await loadOverview()
  }, [getDurationForMode, loadOverview, refreshCurrentUser])

  const handleTimerComplete = () => {
    // Play sound if enabled
    if (soundEnabled) {
      // Would play notification sound here
    }

    void persistSession(timer.mode)

    setTimer((prev) => {
      if (prev.mode === 'focus') {
        // After focus, decide between short or long break
        const isLongBreak = prev.currentSession >= prev.totalSessions
        const nextMode: TimerMode = isLongBreak ? 'long-break' : 'short-break'
        return {
          ...prev,
          mode: nextMode,
          timeRemaining: getDurationForMode(nextMode),
          isRunning: settings.autoStartBreaks,
          currentSession: isLongBreak ? 1 : prev.currentSession,
        }
      } else {
        // After break, start new focus session
        return {
          ...prev,
          mode: 'focus',
          timeRemaining: getDurationForMode('focus'),
          isRunning: settings.autoStartPomodoros,
          currentSession: prev.mode === 'long-break' ? 1 : prev.currentSession + 1,
        }
      }
    })
  }

  const toggleTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }

  const resetTimer = () => {
    setTimer((prev) => ({
      ...prev,
      timeRemaining: getDurationForMode(prev.mode),
      isRunning: false,
    }))
  }

  const skipToNext = () => {
    handleTimerComplete()
  }

  const setMode = (mode: TimerMode) => {
    setTimer((prev) => ({
      ...prev,
      mode,
      timeRemaining: getDurationForMode(mode),
      isRunning: false,
    }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (timer.timeRemaining / getDurationForMode(timer.mode)) * 100
  const circumference = 2 * Math.PI * 140
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getModeColor = (mode: TimerMode) => {
    switch (mode) {
      case 'focus':
        return 'text-primary'
      case 'short-break':
        return 'text-green-500'
      case 'long-break':
        return 'text-blue-500'
    }
  }

  const getModeBackground = (mode: TimerMode) => {
    switch (mode) {
      case 'focus':
        return 'bg-primary/10'
      case 'short-break':
        return 'bg-green-500/10'
      case 'long-break':
        return 'bg-blue-500/10'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Pomodoro Timer</h1>
          <p className="text-muted-foreground">Stay focused and productive</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !soundEnabled
              setSoundEnabled(next)
              setSettings((prev) => ({ ...prev, soundEnabled: next }))
            }}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Timer Settings</DialogTitle>
              </DialogHeader>
              <FieldGroup className="space-y-6 py-4">
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Focus Duration</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {settings.focusDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[settings.focusDuration]}
                    onValueChange={([value]) =>
                      setSettings((prev) => ({ ...prev, focusDuration: value }))
                    }
                    min={15}
                    max={60}
                    step={5}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Short Break</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {settings.shortBreakDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[settings.shortBreakDuration]}
                    onValueChange={([value]) =>
                      setSettings((prev) => ({ ...prev, shortBreakDuration: value }))
                    }
                    min={3}
                    max={15}
                    step={1}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Long Break</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {settings.longBreakDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[settings.longBreakDuration]}
                    onValueChange={([value]) =>
                      setSettings((prev) => ({ ...prev, longBreakDuration: value }))
                    }
                    min={10}
                    max={30}
                    step={5}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Sessions before long break</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {settings.sessionsBeforeLongBreak}
                    </span>
                  </div>
                  <Slider
                    value={[settings.sessionsBeforeLongBreak]}
                    onValueChange={([value]) =>
                      setSettings((prev) => ({ ...prev, sessionsBeforeLongBreak: value }))
                    }
                    min={2}
                    max={6}
                    step={1}
                  />
                </Field>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="mb-0">Auto-start breaks</FieldLabel>
                    <Switch
                      checked={settings.autoStartBreaks}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, autoStartBreaks: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <FieldLabel className="mb-0">Auto-start focus sessions</FieldLabel>
                    <Switch
                      checked={settings.autoStartPomodoros}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, autoStartPomodoros: checked }))
                      }
                    />
                  </div>
                </div>
              </FieldGroup>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Timer Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timer Card */}
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            {/* Mode Tabs */}
            <div className="flex justify-center gap-2 mb-8">
              <Button
                variant={timer.mode === 'focus' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('focus')}
                className={cn(timer.mode === 'focus' && 'bg-primary')}
              >
                <Brain className="mr-2 h-4 w-4" />
                Focus
              </Button>
              <Button
                variant={timer.mode === 'short-break' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('short-break')}
                className={cn(timer.mode === 'short-break' && 'bg-green-500 hover:bg-green-600')}
              >
                <Coffee className="mr-2 h-4 w-4" />
                Short Break
              </Button>
              <Button
                variant={timer.mode === 'long-break' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('long-break')}
                className={cn(timer.mode === 'long-break' && 'bg-blue-500 hover:bg-blue-600')}
              >
                <Coffee className="mr-2 h-4 w-4" />
                Long Break
              </Button>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center">
              <div className="relative h-72 w-72 md:h-80 md:w-80">
                <svg className="h-full w-full -rotate-90 transform">
                  {/* Background circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="140"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50%"
                    cy="50%"
                    r="140"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={cn(
                      'transition-all duration-1000',
                      getModeColor(timer.mode)
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-foreground md:text-6xl">
                    {formatTime(timer.timeRemaining)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn('mt-2', getModeBackground(timer.mode))}
                  >
                    {timer.mode === 'focus' && 'Focus Time'}
                    {timer.mode === 'short-break' && 'Short Break'}
                    {timer.mode === 'long-break' && 'Long Break'}
                  </Badge>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-8 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={resetTimer}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className={cn(
                    'h-14 w-14 rounded-full',
                    timer.mode === 'short-break' && 'bg-green-500 hover:bg-green-600',
                    timer.mode === 'long-break' && 'bg-blue-500 hover:bg-blue-600'
                  )}
                  onClick={toggleTimer}
                >
                  {timer.isRunning ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={skipToNext}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Session Counter */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Session {timer.currentSession} of {timer.totalSessions}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Side Stats */}
        <div className="space-y-6">
          {/* Today's Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Today&apos;s Progress
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Daily Goal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Daily Goals</DialogTitle>
                    </DialogHeader>
                    <FieldGroup className="space-y-4 py-2">
                      <Field>
                        <FieldLabel>Target Focus Hours</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={dailyGoalDraft.targetFocusHours}
                          onChange={(e) =>
                            setDailyGoalDraft((prev) => ({
                              ...prev,
                              targetFocusHours: Number(e.target.value || '1'),
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Target Sessions</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={dailyGoalDraft.targetSessions}
                          onChange={(e) =>
                            setDailyGoalDraft((prev) => ({
                              ...prev,
                              targetSessions: Number(e.target.value || '1'),
                            }))
                          }
                        />
                      </Field>
                      {dailyGoalError && <p className="text-sm text-destructive">{dailyGoalError}</p>}
                      <Button onClick={() => void saveDailyGoal()} disabled={isSavingDailyGoal}>
                        {isSavingDailyGoal ? 'Saving...' : 'Save Daily Goal'}
                      </Button>
                    </FieldGroup>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="font-medium text-foreground">{todayStats.completedSessions} / {dailyGoal.targetSessions}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.round((todayStats.completedSessions / Math.max(1, dailyGoal.targetSessions)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <span className="font-medium text-foreground">{Math.floor(todayStats.focusMinutes / 60)}h {todayStats.focusMinutes % 60}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Daily Goal</span>
                <span className="font-medium text-foreground">{dailyGoal.targetFocusHours}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">
                    {currentUser.currentStreak}
                  </span>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Best: {currentUser.longestStreak} days
              </p>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Take breaks away from your screen
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Stay hydrated during focus sessions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Stretch during long breaks
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
