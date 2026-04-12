'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  LayoutDashboard,
  Timer,
  Users,
  BarChart3,
  Trophy,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Timer', href: '/timer', icon: Timer },
  { title: 'Study Rooms', href: '/rooms', icon: Users },
  { title: 'Activity', href: '/activity', icon: Activity },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Leaderboard', href: '/leaderboard', icon: Trophy },
]

const bottomNavItems = [
  { title: 'Profile', href: '/profile', icon: User },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user: currentUser } = useCurrentUser()
  const handleSignOut = async () => {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      return
    }

    window.location.assign('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center">
          {collapsed ? (
            <Image src="/gemini-svg.svg" alt="FocusHub" width={36} height={36} className="h-9 w-auto" priority />
          ) : (
            <Image
              src="/gemini-svg.svg"
              alt="FocusHub"
              width={220}
              height={52}
              className="h-10 w-auto"
              priority
            />
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn('h-8 w-8', collapsed && 'absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Stats Quick View */}
      {!collapsed && (
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/50">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {currentUser.currentStreak} days
                </span>
                <span>Lvl {currentUser.level}</span>
              </div>
            </div>
          </div>
          {/* XP Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">XP to next level</span>
              <span className="text-foreground">{currentUser.xp % 1000}/1000</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(currentUser.xp % 1000) / 10}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-3">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                void handleSignOut()
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
                collapsed && 'justify-center px-2'
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Log out</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  )
}
