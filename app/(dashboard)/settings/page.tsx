'use client'

import { useEffect, useState } from 'react'
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
import { defaultTimerSettings } from '@/lib/constants/timer-settings'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function SettingsPage() {
  const { user: currentUser, refresh } = useCurrentUser()
  const [timerSettings, setTimerSettings] = useState(defaultTimerSettings)
  const [notifications, setNotifications] = useState({
    sessionComplete: true,
    breakReminder: true,
    streakReminder: true,
    weeklyReport: true,
    roomInvites: true,
    achievements: true,
    emailSessionComplete: true,
    emailWeeklyReport: true,
    emailRoomInvites: true,
    emailAchievements: true,
    marketingEmails: false,
    productUpdates: true,
  })
  const [theme, setTheme] = useState('dark')
  const [compactMode, setCompactMode] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [timerMessage, setTimerMessage] = useState<string | null>(null)
  const [emailTestMessage, setEmailTestMessage] = useState<string | null>(null)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isSavingTimer, setIsSavingTimer] = useState(false)
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const [settingsResponse, timerResponse] = await Promise.all([
        fetch('/api/settings', { cache: 'no-store' }),
        fetch('/api/timer-settings', { cache: 'no-store' }),
      ])

      const settingsPayload = await settingsResponse.json().catch(() => null)
      const timerPayload = await timerResponse.json().catch(() => null)

      if (settingsResponse.ok && settingsPayload?.success) {
        setTheme(settingsPayload.appearance?.theme ?? 'dark')
        setCompactMode(Boolean(settingsPayload.appearance?.compactMode))
        setNotifications((prev) => ({
          ...prev,
          ...(settingsPayload.notifications ?? {}),
        }))
        setAccountName(settingsPayload.account?.name ?? currentUser.name)
        setAccountEmail(settingsPayload.account?.email ?? currentUser.email)
      } else {
        setAccountName(currentUser.name)
        setAccountEmail(currentUser.email)
      }

      if (timerResponse.ok && timerPayload?.success && timerPayload?.timer) {
        setTimerSettings((prev) => ({
          ...prev,
          focusDuration: timerPayload.timer.focusDuration,
          shortBreakDuration: timerPayload.timer.shortBreakDuration,
          longBreakDuration: timerPayload.timer.longBreakDuration,
          sessionsBeforeLongBreak: timerPayload.timer.sessionsBeforeLongBreak,
          autoStartBreaks: timerPayload.timer.autoStartBreaks,
          autoStartPomodoros: timerPayload.timer.autoStartPomodoros,
          soundEnabled: timerPayload.timer.soundEnabled,
        }))
      }
    }

    void loadSettings()
  }, [currentUser.email, currentUser.name])

  const savePreferences = async () => {
    setIsSavingPrefs(true)
    setPrefsMessage(null)

    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appearance: {
          theme,
          compactMode,
        },
        notifications,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPrefsMessage(payload?.error ?? 'Unable to save preferences')
      setIsSavingPrefs(false)
      return
    }

    setPrefsMessage('Preferences saved')
    setIsSavingPrefs(false)
  }

  const saveTimerSettings = async () => {
    setIsSavingTimer(true)
    setTimerMessage(null)

    const response = await fetch('/api/timer-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focusDuration: timerSettings.focusDuration,
        shortBreakDuration: timerSettings.shortBreakDuration,
        longBreakDuration: timerSettings.longBreakDuration,
        sessionsBeforeLongBreak: timerSettings.sessionsBeforeLongBreak,
        autoStartBreaks: timerSettings.autoStartBreaks,
        autoStartPomodoros: timerSettings.autoStartPomodoros,
        soundEnabled: timerSettings.soundEnabled,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setTimerMessage(payload?.error ?? 'Unable to save timer settings')
      setIsSavingTimer(false)
      return
    }

    setTimerMessage('Timer settings saved')
    setIsSavingTimer(false)
  }

  const saveAccount = async () => {
    setIsSavingAccount(true)
    setAccountMessage(null)

    const response = await fetch('/api/settings/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: accountName, email: accountEmail }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setAccountMessage(payload?.error ?? 'Unable to save account details')
      setIsSavingAccount(false)
      return
    }

    setAccountMessage('Account details saved')
    setIsSavingAccount(false)
    await refresh()
  }

  const sendTestEmail = async () => {
    setIsSendingEmailTest(true)
    setEmailTestMessage(null)

    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setEmailTestMessage(payload?.error ?? 'Unable to send test email')
      setIsSendingEmailTest(false)
      return
    }

    setEmailTestMessage('Test email sent')
    setIsSendingEmailTest(false)
  }

  const savePassword = async () => {
    setIsSavingPassword(true)
    setPasswordMessage(null)

    const response = await fetch('/api/settings/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setPasswordMessage(payload?.error ?? 'Unable to update password')
      setIsSavingPassword(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password updated')
    setIsSavingPassword(false)
  }

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
                <Switch checked={compactMode} onCheckedChange={setCompactMode} />
              </div>

              <Button onClick={() => void savePreferences()} disabled={isSavingPrefs}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
              {prefsMessage && <p className="text-sm text-muted-foreground">{prefsMessage}</p>}
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
                <Switch
                  checked={timerSettings.soundEnabled}
                  onCheckedChange={(checked) =>
                    setTimerSettings((prev) => ({ ...prev, soundEnabled: checked }))
                  }
                />
              </div>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Volume</FieldLabel>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <Slider defaultValue={[75]} max={100} step={5} />
              </Field>
              <Button onClick={() => void savePreferences()} disabled={isSavingPrefs}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
              {prefsMessage && <p className="text-sm text-muted-foreground">{prefsMessage}</p>}
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

          <div className="flex items-center gap-3">
            <Button onClick={() => void saveTimerSettings()} disabled={isSavingTimer}>
              <Save className="mr-2 h-4 w-4" />
              {isSavingTimer ? 'Saving...' : 'Save Timer Settings'}
            </Button>
            {timerMessage && <p className="text-sm text-muted-foreground">{timerMessage}</p>}
          </div>
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

              <Button onClick={() => void savePreferences()} disabled={isSavingPrefs}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
              {prefsMessage && <p className="text-sm text-muted-foreground">{prefsMessage}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: 'emailSessionComplete',
                  label: 'Session Complete',
                  desc: 'Receive an email after each completed focus session',
                },
                {
                  key: 'emailWeeklyReport',
                  label: 'Weekly Report',
                  desc: 'Get a weekly summary of your study activity',
                },
                {
                  key: 'emailRoomInvites',
                  label: 'Room Invites',
                  desc: 'Get an email when someone invites you to a study room',
                },
                {
                  key: 'emailAchievements',
                  label: 'Achievements',
                  desc: 'Get notified when you unlock a new badge',
                },
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

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Marketing Emails</FieldLabel>
                  <p className="text-sm text-muted-foreground">Receive news and updates</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, marketingEmails: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FieldLabel className="mb-0">Product Updates</FieldLabel>
                  <p className="text-sm text-muted-foreground">Learn about new features</p>
                </div>
                <Switch
                  checked={notifications.productUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, productUpdates: checked }))
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => void savePreferences()} disabled={isSavingPrefs}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
                </Button>
                <Button variant="secondary" onClick={() => void sendTestEmail()} disabled={isSendingEmailTest}>
                  <Bell className="mr-2 h-4 w-4" />
                  {isSendingEmailTest ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
              {prefsMessage && <p className="text-sm text-muted-foreground">{prefsMessage}</p>}
              {emailTestMessage && <p className="text-sm text-muted-foreground">{emailTestMessage}</p>}
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
                  <Input
                    id="account-name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="account-email">Email</FieldLabel>
                  <Input
                    id="account-email"
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                  />
                </Field>
                <Button onClick={() => void saveAccount()} disabled={isSavingAccount}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingAccount ? 'Saving...' : 'Save Changes'}
                </Button>
                {accountMessage && <p className="text-sm text-muted-foreground">{accountMessage}</p>}
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
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
                <Button onClick={() => void savePassword()} disabled={isSavingPassword}>
                  {isSavingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                {passwordMessage && <p className="text-sm text-muted-foreground">{passwordMessage}</p>}
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
