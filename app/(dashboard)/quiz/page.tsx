'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, Clock, Trophy, Target, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuizCategory = {
  slug: string
  name: string
  description: string | null
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

type QuizFeedback = {
  questionId: string
  question: string
  selectedOption: number | null
  correctOption: number | null
  isCorrect: boolean
  explanation: string | null
}

type QuizResult = {
  categorySlug: string
  totalQuestions: number
  correctAnswers: number
  scorePercent: number
  pointsEarned: number
  timeLimitSeconds: number
  timeSpentSeconds: number
  nextXp: number
  nextLevel: number
}

type LeaderboardEntry = {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  attempts: number
  totalPoints: number
  averageScore: number
  bestScore: number
}

type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time'

type QuizStage = 'setup' | 'running' | 'result'

function formatSeconds(total: number) {
  const safe = Math.max(0, total)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const leaderboardTabs: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all-time', label: 'All Time' },
]

export default function QuizPage() {
  const [stage, setStage] = useState<QuizStage>('setup')
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [questionCount, setQuestionCount] = useState('10')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | null>>({})
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0)
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<QuizResult | null>(null)
  const [feedback, setFeedback] = useState<QuizFeedback[]>([])

  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('weekly')
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [leaderboardRank, setLeaderboardRank] = useState(0)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const autoSubmitTriggeredRef = useRef(false)

  const selectedCategoryInfo = useMemo(
    () => categories.find((item) => item.slug === selectedCategory) ?? null,
    [categories, selectedCategory],
  )

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== null).length,
    [questions, answers],
  )

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/quiz/categories', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to load quiz categories')
      return
    }

    const nextCategories = (payload.categories ?? []) as QuizCategory[]
    setCategories(nextCategories)
    if (nextCategories.length > 0) {
      setSelectedCategory((prev) => prev || nextCategories[0].slug)
    }
  }, [])

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)

    const categoryParam = selectedCategory || 'all'
    const response = await fetch(
      `/api/quiz/leaderboard?period=${leaderboardPeriod}&category=${categoryParam}&limit=50`,
      { cache: 'no-store' },
    )

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setLeaderboardEntries([])
      setLeaderboardRank(0)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardEntries(payload.entries ?? [])
    setLeaderboardRank(payload.currentUserRank ?? 0)
    setLeaderboardLoading(false)
  }, [leaderboardPeriod, selectedCategory])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!selectedCategory) return
    void loadLeaderboard()
  }, [loadLeaderboard, selectedCategory])

  useEffect(() => {
    if (stage !== 'running') return
    if (timeRemainingSeconds <= 0) return

    const interval = window.setInterval(() => {
      setTimeRemainingSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [stage, timeRemainingSeconds])

  const submitQuiz = useCallback(async () => {
    if (isSubmitting || questions.length === 0 || !selectedCategory) return

    setIsSubmitting(true)
    setError('')

    const answerPayload = questions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id] ?? null,
    }))

    const timeSpentSeconds = Math.max(0, timeLimitSeconds - timeRemainingSeconds)

    const response = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categorySlug: selectedCategory,
        timeLimitSeconds,
        timeSpentSeconds,
        answers: answerPayload,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to submit quiz')
      setIsSubmitting(false)
      return
    }

    setResult(payload.result ?? null)
    setFeedback(payload.feedback ?? [])
    setStage('result')
    setIsSubmitting(false)
    void loadLeaderboard()
  }, [answers, isSubmitting, loadLeaderboard, questions, selectedCategory, timeLimitSeconds, timeRemainingSeconds])

  useEffect(() => {
    if (stage !== 'running') return
    if (timeRemainingSeconds > 0) return
    if (autoSubmitTriggeredRef.current) return

    autoSubmitTriggeredRef.current = true
    void submitQuiz()
  }, [stage, submitQuiz, timeRemainingSeconds])

  const startQuiz = async () => {
    if (!selectedCategory) {
      setError('Choose a category first')
      return
    }

    setIsLoadingQuiz(true)
    setError('')
    autoSubmitTriggeredRef.current = false

    const response = await fetch(
      `/api/quiz/questions?category=${selectedCategory}&limit=${Number(questionCount) || 10}`,
      { cache: 'no-store' },
    )

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? 'Unable to start quiz')
      setIsLoadingQuiz(false)
      return
    }

    const nextQuestions = (payload.questions ?? []) as QuizQuestion[]
    const limitSeconds = nextQuestions.length * 45

    setQuestions(nextQuestions)
    setAnswers({})
    setCurrentIndex(0)
    setTimeLimitSeconds(limitSeconds)
    setTimeRemainingSeconds(limitSeconds)
    setResult(null)
    setFeedback([])
    setStage('running')
    setIsLoadingQuiz(false)
  }

  const resetToSetup = () => {
    setStage('setup')
    setQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setTimeLimitSeconds(0)
    setTimeRemainingSeconds(0)
    setResult(null)
    setFeedback([])
    setError('')
    autoSubmitTriggeredRef.current = false
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Quiz Arena</h1>
          <p className="text-muted-foreground">Practice by subject, race the timer, and climb the leaderboard.</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Trophy className="mr-1 h-3 w-3" />
          Rank: {leaderboardRank > 0 ? `#${leaderboardRank}` : 'Unranked'}
        </Badge>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {stage === 'setup' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Start A Subject Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Category</p>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategoryInfo?.description ? (
                  <p className="text-xs text-muted-foreground">{selectedCategoryInfo.description}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Questions</p>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Timer is set to 45 seconds per question.</p>
              </div>
            </div>

            <Button onClick={() => void startQuiz()} disabled={!selectedCategory || isLoadingQuiz}>
              {isLoadingQuiz ? 'Preparing Quiz...' : 'Start Quiz'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {stage === 'running' && currentQuestion ? (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="secondary">
                Question {currentIndex + 1}/{questions.length}
              </Badge>
              <Badge variant={timeRemainingSeconds <= 20 ? 'destructive' : 'outline'}>
                <Clock className="mr-1 h-3 w-3" />
                {formatSeconds(timeRemainingSeconds)}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Difficulty: {currentQuestion.difficulty}</p>
              <h2 className="text-lg font-semibold text-foreground">{currentQuestion.question}</h2>
            </div>

            <div className="space-y-2">
              {currentQuestion.options.map((option, optionIndex) => {
                const selected = answers[currentQuestion.id] === optionIndex
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: optionIndex,
                      }))
                    }
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                    {option}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentIndex < questions.length - 1 ? (
                  <Button onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => void submitQuiz()} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Answered {answeredCount} of {questions.length}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {stage === 'result' && result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quiz Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-xl font-semibold">{result.scorePercent}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Correct</p>
                <p className="text-xl font-semibold">{result.correctAnswers}/{result.totalQuestions}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-xl font-semibold">+{result.pointsEarned}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Time Used</p>
                <p className="text-xl font-semibold">{formatSeconds(result.timeSpentSeconds)}</p>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p>
                Level <span className="font-semibold">{result.nextLevel}</span> • XP <span className="font-semibold">{result.nextXp}</span>
              </p>
            </div>

            <div className="space-y-2">
              {feedback.map((item) => (
                <div key={item.questionId} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" /> Incorrect
                      </span>
                    )}
                    {item.correctOption !== null ? (
                      <span className="text-muted-foreground">Correct option: {String.fromCharCode(65 + item.correctOption)}</span>
                    ) : null}
                  </div>
                  {item.explanation ? <p className="mt-1 text-xs text-muted-foreground">{item.explanation}</p> : null}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => void startQuiz()} disabled={isLoadingQuiz}>Try Again</Button>
              <Button variant="outline" onClick={resetToSetup}>Back To Setup</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Quiz Leaderboard
          </CardTitle>
          <Tabs value={leaderboardPeriod} onValueChange={(v) => setLeaderboardPeriod(v as LeaderboardPeriod)}>
            <TabsList>
              {leaderboardTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
          ) : leaderboardEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts yet for this filter.</p>
          ) : (
            <div className="space-y-2">
              {leaderboardEntries.map((entry) => (
                <div key={entry.userId} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-foreground">#{entry.rank} {entry.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      Attempts: {entry.attempts} • Avg: {entry.averageScore}% • Best: {entry.bestScore}%
                    </p>
                  </div>
                  <Badge variant="secondary">{entry.totalPoints} pts</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
