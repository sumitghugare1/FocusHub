'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

type WeeklyGoal = {
  weekStart: string
  targetFocusHours: number
  targetSessions: number
  targetStreakDays: number
  achievedFocusHours: number
  achievedSessions: number
  achievedStreakDays: number
  progressPercentage: number
}

export function WeeklyGoalEditor() {
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGoal = async () => {
    const response = await fetch('/api/weekly-goals', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (response.ok && payload?.weeklyGoal) {
      setWeeklyGoal(payload.weeklyGoal)
      setError(null)
      return
    }

    setError(payload?.error ?? 'Unable to load weekly goal')
  }

  useEffect(() => {
    void loadGoal()
  }, [])

  const saveGoal = async () => {
    if (!weeklyGoal) return

    setIsSaving(true)
    setError(null)

    const response = await fetch('/api/weekly-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetFocusHours: weeklyGoal.targetFocusHours,
        targetSessions: weeklyGoal.targetSessions,
        targetStreakDays: weeklyGoal.targetStreakDays,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? 'Unable to save weekly goal')
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await loadGoal()
  }

  if (!weeklyGoal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading weekly goals...</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={weeklyGoal.progressPercentage} className="h-2" />
        <p className="text-sm text-muted-foreground">Overall progress: {weeklyGoal.progressPercentage}%</p>

        <FieldGroup className="space-y-3">
          <Field>
            <FieldLabel>Target Focus Hours</FieldLabel>
            <Input
              type="number"
              min={1}
              max={100}
              value={weeklyGoal.targetFocusHours}
              onChange={(e) =>
                setWeeklyGoal((prev) =>
                  prev
                    ? {
                        ...prev,
                        targetFocusHours: Number(e.target.value || '1'),
                      }
                    : prev,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Achieved: {weeklyGoal.achievedFocusHours}h
            </p>
          </Field>

          <Field>
            <FieldLabel>Target Sessions</FieldLabel>
            <Input
              type="number"
              min={1}
              max={300}
              value={weeklyGoal.targetSessions}
              onChange={(e) =>
                setWeeklyGoal((prev) =>
                  prev
                    ? {
                        ...prev,
                        targetSessions: Number(e.target.value || '1'),
                      }
                    : prev,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Achieved: {weeklyGoal.achievedSessions}
            </p>
          </Field>

          <Field>
            <FieldLabel>Target Streak Days</FieldLabel>
            <Input
              type="number"
              min={1}
              max={7}
              value={weeklyGoal.targetStreakDays}
              onChange={(e) =>
                setWeeklyGoal((prev) =>
                  prev
                    ? {
                        ...prev,
                        targetStreakDays: Number(e.target.value || '1'),
                      }
                    : prev,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Achieved: {weeklyGoal.achievedStreakDays} day(s)
            </p>
          </Field>
        </FieldGroup>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={() => void saveGoal()} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Weekly Goals'}
        </Button>
      </CardContent>
    </Card>
  )
}
