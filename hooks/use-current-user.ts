'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@/types'

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  role: 'user',
  createdAt: '',
  totalStudyTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  sessionsCompleted: 0,
  level: 0,
  xp: 0,
  badges: [],
  status: 'offline',
}

export function useCurrentUser() {
  const [user, setUser] = useState<User>(EMPTY_USER)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })

      if (!response.ok) {
        setIsLoading(false)
        return
      }

      const payload = await response.json()
      if (payload?.user) {
        setUser(payload.user)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleRefreshEvent = () => {
      void refresh()
    }

    const handleWindowFocus = () => {
      void refresh()
    }

    window.addEventListener('focushub:user-refresh', handleRefreshEvent as EventListener)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('focushub:user-refresh', handleRefreshEvent as EventListener)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [refresh])

  return { user, isLoading, refresh }
}
