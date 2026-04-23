'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, CalendarClock, BellRing, LineChart } from 'lucide-react'

type SessionRecommendation = {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  breakStyle: 'standard' | 'recovery' | 'momentum'
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
}

type DailyPlan = {
  planDate: string
  summary: string
  totalPlannedMinutes: number
  sessions: Array<{
    order: number
    title: string
    focusMinutes: number
    breakMinutes: number
    intensity: 'light' | 'moderate' | 'deep'
  }>
  actionItems: string[]
}

type WeeklyReflection = {
  weekStart: string
  summary: string
  whatWorked: string[]
  whereTimeWasLost: string[]
  nextWeekAdjustments: string[]
  metrics: {
    focusMinutes: number
    completedSessions: number
    abandonedSessions: number
    completionRate: number
  }
}

export default function CoachPage() {
  const [availableMinutes, setAvailableMinutes] = useState(180)
  const [recommendation, setRecommendation] = useState<SessionRecommendation | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [reflection, setReflection] = useState<WeeklyReflection | null>(null)
  const [nudgePreview, setNudgePreview] = useState<Array<{ title: string; message: string; action: string }>>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState({
    recommendation: false,
    dailyPlan: false,
    nudges: false,
    reflection: false,
  })

  const loadRecommendation = async () => {
    setLoading((prev) => ({ ...prev, recommendation: true }))
    const response = await fetch('/api/ai/session-recommendation', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (response.ok && payload?.success) {
      setRecommendation(payload.recommendation)
    }

    setLoading((prev) => ({ ...prev, recommendation: false }))
  }

  useEffect(() => {
    void loadRecommendation()
  }, [])

  const generateDailyPlan = async () => {
    setLoading((prev) => ({ ...prev, dailyPlan: true }))
    setStatusMessage(null)

    const response = await fetch('/api/ai/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableMinutes, save: true }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setStatusMessage(payload?.error ?? 'Unable to generate daily plan')
      setLoading((prev) => ({ ...prev, dailyPlan: false }))
      return
    }

    setDailyPlan(payload.plan)
    setStatusMessage(`Daily plan generated using ${payload.source} mode.`)
    setLoading((prev) => ({ ...prev, dailyPlan: false }))
  }

  const sendSmartNudges = async () => {
    setLoading((prev) => ({ ...prev, nudges: true }))
    setStatusMessage(null)

    const response = await fetch('/api/ai/smart-nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: false }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setStatusMessage(payload?.error ?? 'Unable to send nudges')
      setLoading((prev) => ({ ...prev, nudges: false }))
      return
    }

    setNudgePreview(payload.nudges ?? [])
    setStatusMessage((payload.nudges ?? []).length > 0 ? 'Smart nudges sent.' : 'No nudge required right now.')
    setLoading((prev) => ({ ...prev, nudges: false }))
  }

  const generateWeeklyReflection = async () => {
    setLoading((prev) => ({ ...prev, reflection: true }))
    setStatusMessage(null)

    const response = await fetch('/api/ai/weekly-reflection', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setStatusMessage(payload?.error ?? 'Unable to generate weekly reflection')
      setLoading((prev) => ({ ...prev, reflection: false }))
      return
    }

    setReflection(payload.reflection)
    setStatusMessage(`Weekly reflection generated using ${payload.source} mode.`)
    setLoading((prev) => ({ ...prev, reflection: false }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Coach</h1>
        <p className="text-muted-foreground">Adaptive daily planning, recommendations, nudges, and weekly reviews powered by your Supabase study history.</p>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">{statusMessage}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Session Recommendation</CardTitle>
            <CardDescription>Based on your recent completion and abandonment patterns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => void loadRecommendation()} disabled={loading.recommendation}>
              {loading.recommendation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh Recommendation
            </Button>

            {recommendation && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge>{recommendation.focusMinutes}m focus</Badge>
                  <Badge variant="secondary">{recommendation.shortBreakMinutes}m short break</Badge>
                  <Badge variant="secondary">{recommendation.breakStyle}</Badge>
                  <Badge variant="outline">{recommendation.confidence}</Badge>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  {recommendation.reasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Daily Plan Generator</CardTitle>
            <CardDescription>Create a realistic plan from goals, available time, and recent behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Minutes Today</label>
              <Input
                type="number"
                min={30}
                max={720}
                value={availableMinutes}
                onChange={(event) => setAvailableMinutes(Number(event.target.value || 0))}
              />
            </div>
            <Button onClick={() => void generateDailyPlan()} disabled={loading.dailyPlan || availableMinutes < 30}>
              {loading.dailyPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Daily Plan
            </Button>

            {dailyPlan && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{dailyPlan.summary}</p>
                <div className="flex items-center gap-2">
                  <Badge>{dailyPlan.totalPlannedMinutes} total min</Badge>
                  <Badge variant="outline">{dailyPlan.sessions.length} sessions</Badge>
                </div>
                <div className="space-y-2">
                  {dailyPlan.sessions.map((session) => (
                    <div key={session.order} className="rounded-md border border-border p-2">
                      <p className="font-medium">{session.order}. {session.title}</p>
                      <p className="text-xs text-muted-foreground">{session.focusMinutes}m focus / {session.breakMinutes}m break - {session.intensity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Smart Nudges</CardTitle>
            <CardDescription>Send in-app and email nudges when streak or weekly goals are at risk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => void sendSmartNudges()} disabled={loading.nudges}>
              {loading.nudges ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Evaluate and Send Nudges
            </Button>
            <div className="space-y-2">
              {nudgePreview.map((nudge) => (
                <div key={nudge.title} className="rounded-md border border-border p-2 text-sm">
                  <p className="font-medium">{nudge.title}</p>
                  <p className="text-muted-foreground">{nudge.message}</p>
                  <p className="text-xs text-primary mt-1">Action: {nudge.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5 text-primary" /> Weekly Reflection</CardTitle>
            <CardDescription>Auto summary of wins, losses, and next-week adjustments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => void generateWeeklyReflection()} disabled={loading.reflection}>
              {loading.reflection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Weekly Reflection
            </Button>

            {reflection && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{reflection.summary}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge variant="outline">Focus {Math.round(reflection.metrics.focusMinutes / 60)}h</Badge>
                  <Badge variant="outline">Completion {(reflection.metrics.completionRate * 100).toFixed(0)}%</Badge>
                </div>
                <div>
                  <p className="font-medium">Next Week</p>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    {reflection.nextWeekAdjustments.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
