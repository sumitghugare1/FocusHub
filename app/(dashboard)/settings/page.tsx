'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Timer,
  Bell,
  User,
  Moon,
  Sun,
  Volume2,
  Shield,
  Trash2,
  Save,
} from 'lucide-react'
import { defaultTimerSettings } from '@/lib/mock-data'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function SettingsPage() {
  const { user: currentUser } = useCurrentUser()
  const [timerSettings, setTimerSettings] = useState(defaultTimerSettings)
  const [notifications, setNotifications] = useState({
    sessionComplete: true,
    breakReminder: true,
    streakReminder: true,
    weeklyReport: true,
    roomInvites: true,
    achievements: true,
  })
  const [theme, setTheme] = useState('dark')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and account settings</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4 hidden sm:inline" />
            General
          </TabsTrigger>
          <TabsTrigger value="timer" className="gap-2">
            <Timer className="h-4 w-4 hidden sm:inline" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4 hidden sm:inline" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4 hidden sm:inline" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how FocusHub looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Theme</FieldLabel>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Compact Mode</FieldLabel>
                  <p className="text-sm text-muted-foreground">Use smaller UI elements</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sound</CardTitle>
              <CardDescription>Configure audio settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <FieldLabel className="mb-0">Sound Effects</FieldLabel>
                    <p className="text-sm text-muted-foreground">Play sounds for timer events</p>
                  </div>
                </div>
                <Switch checked={timerSettings.soundEnabled} />
              </div>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Volume</FieldLabel>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <Slider defaultValue={[75]} max={100} step={5} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timer Settings */}
        <TabsContent value="timer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timer Durations</CardTitle>
              <CardDescription>Customize your Pomodoro timer settings</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="space-y-6">
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Focus Duration</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {timerSettings.focusDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[timerSettings.focusDuration]}
                    onValueChange={([value]) =>
                      setTimerSettings((prev) => ({ ...prev, focusDuration: value }))
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
                      {timerSettings.shortBreakDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[timerSettings.shortBreakDuration]}
                    onValueChange={([value]) =>
                      setTimerSettings((prev) => ({ ...prev, shortBreakDuration: value }))
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
                      {timerSettings.longBreakDuration} min
                    </span>
                  </div>
                  <Slider
                    value={[timerSettings.longBreakDuration]}
                    onValueChange={([value]) =>
                      setTimerSettings((prev) => ({ ...prev, longBreakDuration: value }))
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
                      {timerSettings.sessionsBeforeLongBreak}
                    </span>
                  </div>
                  <Slider
                    value={[timerSettings.sessionsBeforeLongBreak]}
                    onValueChange={([value]) =>
                      setTimerSettings((prev) => ({ ...prev, sessionsBeforeLongBreak: value }))
                    }
                    min={2}
                    max={6}
                    step={1}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation</CardTitle>
              <CardDescription>Configure automatic timer behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Auto-start breaks</FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Automatically start breaks after focus sessions
                  </p>
                </div>
                <Switch
                  checked={timerSettings.autoStartBreaks}
                  onCheckedChange={(checked) =>
                    setTimerSettings((prev) => ({ ...prev, autoStartBreaks: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Auto-start focus sessions</FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Automatically start focus sessions after breaks
                  </p>
                </div>
                <Switch
                  checked={timerSettings.autoStartPomodoros}
                  onCheckedChange={(checked) =>
                    setTimerSettings((prev) => ({ ...prev, autoStartPomodoros: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'sessionComplete', label: 'Session Complete', desc: 'When a focus or break session ends' },
                { key: 'breakReminder', label: 'Break Reminder', desc: 'Reminder to take breaks' },
                { key: 'streakReminder', label: 'Streak Reminder', desc: 'Daily reminder to maintain your streak' },
                { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly summary of your progress' },
                { key: 'roomInvites', label: 'Room Invites', desc: 'When someone invites you to a study room' },
                { key: 'achievements', label: 'Achievements', desc: 'When you earn a new badge' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <FieldLabel className="mb-0">{item.label}</FieldLabel>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Marketing Emails</FieldLabel>
                  <p className="text-sm text-muted-foreground">Receive news and updates</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Product Updates</FieldLabel>
                  <p className="text-sm text-muted-foreground">Learn about new features</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="account-name">Name</FieldLabel>
                  <Input id="account-name" defaultValue={currentUser.name} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="account-email">Email</FieldLabel>
                  <Input id="account-email" type="email" defaultValue={currentUser.email} />
                </Field>
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
                  <Input id="current-password" type="password" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <Input id="new-password" type="password" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
                  <Input id="confirm-password" type="password" />
                </Field>
                <Button>Update Password</Button>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                <div>
                  <p className="font-medium text-foreground">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all of your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
