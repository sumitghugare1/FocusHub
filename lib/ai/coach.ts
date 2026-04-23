import { z } from 'zod'

export const DailyPlanSchema = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
  totalPlannedMinutes: z.number().int().min(0),
  sessions: z.array(
    z.object({
      order: z.number().int().min(1),
      title: z.string().min(1),
      taskId: z.string().uuid().nullable(),
      focusMinutes: z.number().int().min(10).max(90),
      breakMinutes: z.number().int().min(3).max(20),
      intensity: z.enum(['light', 'moderate', 'deep']),
    }),
  ),
  actionItems: z.array(z.string().min(1)).max(6),
})

export type DailyPlan = z.infer<typeof DailyPlanSchema>

export const WeeklyReflectionSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
  whatWorked: z.array(z.string().min(1)).max(6),
  whereTimeWasLost: z.array(z.string().min(1)).max(6),
  nextWeekAdjustments: z.array(z.string().min(1)).max(6),
  metrics: z.object({
    focusMinutes: z.number().int().min(0),
    completedSessions: z.number().int().min(0),
    abandonedSessions: z.number().int().min(0),
    completionRate: z.number().min(0).max(1),
  }),
})

export type WeeklyReflection = z.infer<typeof WeeklyReflectionSchema>

export type SessionRecommendation = {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  breakStyle: 'standard' | 'recovery' | 'momentum'
  confidence: 'low' | 'medium' | 'high'
  reasons: string[]
}

export function getDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

export function getWeekStartFromDate(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  const weekday = date.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

function parsePriority(priority: string | null | undefined) {
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

export function computeSessionRecommendation(args: {
  totalRows: number
  completedRows: number
  abandonedRows: number
  averageCompletedMinutes: number
  averageInterruptions: number
}): SessionRecommendation {
  const total = Math.max(0, args.totalRows)
  const completionRate = total === 0 ? 0.7 : args.completedRows / total
  const abandonmentRate = total === 0 ? 0.3 : args.abandonedRows / total

  let focusMinutes = 25
  if (completionRate < 0.55) {
    focusMinutes = 20
  } else if (completionRate > 0.85 && args.averageCompletedMinutes >= 35) {
    focusMinutes = 35
  } else if (completionRate > 0.75 && args.averageCompletedMinutes >= 28) {
    focusMinutes = 30
  }

  let breakStyle: SessionRecommendation['breakStyle'] = 'standard'
  let shortBreakMinutes = 5
  let longBreakMinutes = 15

  if (abandonmentRate > 0.35 || args.averageInterruptions >= 2) {
    breakStyle = 'recovery'
    shortBreakMinutes = 8
    longBreakMinutes = 18
  } else if (completionRate > 0.85) {
    breakStyle = 'momentum'
    shortBreakMinutes = 4
    longBreakMinutes = 12
  }

  const confidence: SessionRecommendation['confidence'] =
    total >= 20 ? 'high' : total >= 8 ? 'medium' : 'low'

  const reasons = [
    `Completion rate in recent sessions is ${(completionRate * 100).toFixed(0)}%.`,
    `Average interruptions per session are ${args.averageInterruptions.toFixed(1)}.`,
  ]

  return {
    focusMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    breakStyle,
    confidence,
    reasons,
  }
}

export function buildRuleBasedDailyPlan(args: {
  planDate: string
  availableMinutes: number
  tasks: Array<{ id: string; title: string; priority: string | null; estimated_minutes: number | null }>
  recommendation: SessionRecommendation
  targetSessions: number
  completedSessionsToday: number
}): DailyPlan {
  const focusMinutes = args.recommendation.focusMinutes
  const breakMinutes = args.recommendation.shortBreakMinutes
  const maxByTime = Math.max(1, Math.floor(args.availableMinutes / (focusMinutes + breakMinutes)))
  const targetRemaining = Math.max(1, args.targetSessions - args.completedSessionsToday)
  const sessionCount = Math.min(8, Math.max(1, Math.min(maxByTime, targetRemaining)))

  const sortedTasks = [...args.tasks].sort((a, b) => {
    const priorityDelta = parsePriority(b.priority) - parsePriority(a.priority)
    if (priorityDelta !== 0) return priorityDelta
    const aMinutes = a.estimated_minutes ?? 999
    const bMinutes = b.estimated_minutes ?? 999
    return aMinutes - bMinutes
  })

  const sessions = Array.from({ length: sessionCount }, (_, index) => {
    const mappedTask = sortedTasks[index % Math.max(1, sortedTasks.length)]
    const title = mappedTask?.title ?? `Deep work block ${index + 1}`
    const intensity = focusMinutes >= 35 ? 'deep' : focusMinutes >= 25 ? 'moderate' : 'light'

    return {
      order: index + 1,
      title,
      taskId: mappedTask?.id ?? null,
      focusMinutes,
      breakMinutes,
      intensity,
    }
  })

  return {
    planDate: args.planDate,
    summary: `Plan for ${sessionCount} focused sessions using a ${focusMinutes}/${breakMinutes} rhythm.`,
    totalPlannedMinutes: sessions.reduce((sum, session) => sum + session.focusMinutes + session.breakMinutes, 0),
    sessions,
    actionItems: [
      'Start with the highest-priority task in session 1.',
      'Keep phone and social apps blocked during focus blocks.',
      'Do a 2-minute review after each session before break.',
    ],
  }
}

export function buildRuleBasedWeeklyReflection(args: {
  weekStart: string
  focusMinutes: number
  completedSessions: number
  abandonedSessions: number
  completionRate: number
  topTaskCategories: string[]
}): WeeklyReflection {
  const whatWorked: string[] = []
  const whereTimeWasLost: string[] = []
  const nextWeekAdjustments: string[] = []

  if (args.completedSessions >= 20) {
    whatWorked.push('You maintained strong session volume throughout the week.')
  }

  if (args.completionRate >= 0.75) {
    whatWorked.push('You finished most sessions once started, showing good focus consistency.')
  }

  if (args.topTaskCategories.length > 0) {
    whatWorked.push(`You spent most focused time on: ${args.topTaskCategories.slice(0, 3).join(', ')}.`)
  }

  if (args.abandonedSessions >= 6) {
    whereTimeWasLost.push('Frequent abandoned sessions indicate context switching or over-ambitious block sizes.')
    nextWeekAdjustments.push('Use a shorter first session (20-25 min) to reduce drop-off in the first hour.')
  }

  if (args.focusMinutes < 600) {
    whereTimeWasLost.push('Total weekly focus time stayed below 10 hours.')
    nextWeekAdjustments.push('Schedule at least two protected deep-work windows before noon on weekdays.')
  }

  if (whereTimeWasLost.length === 0) {
    whereTimeWasLost.push('No major bottleneck this week; performance was steady.')
  }

  if (nextWeekAdjustments.length === 0) {
    nextWeekAdjustments.push('Increase daily target by one additional focus session on three days next week.')
  }

  return {
    weekStart: args.weekStart,
    summary: `You logged ${Math.round(args.focusMinutes / 60)} focus hours with ${(args.completionRate * 100).toFixed(0)}% completion rate this week.`,
    whatWorked,
    whereTimeWasLost,
    nextWeekAdjustments,
    metrics: {
      focusMinutes: args.focusMinutes,
      completedSessions: args.completedSessions,
      abandonedSessions: args.abandonedSessions,
      completionRate: args.completionRate,
    },
  }
}
