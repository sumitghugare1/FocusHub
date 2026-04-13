'use client'

import { StudyPlanner } from '@/components/planner/study-planner'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function PlannerPage() {
  const { user } = useCurrentUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Study Planner</h1>
        <p className="text-muted-foreground">Plan tasks for yourself or keep a room task list in sync.</p>
      </div>

      <StudyPlanner currentUserId={user.id} />
    </div>
  )
}
