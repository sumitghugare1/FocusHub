"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Bell,
  Shield,
  Database,
  Mail,
  Globe,
  Palette,
  Save,
} from "lucide-react"

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "FocusHub"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const FROM_EMAIL = process.env.NEXT_PUBLIC_FROM_EMAIL ?? "noreply@example.com"

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    general: {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      siteDescription: "Virtual study rooms and Pomodoro timer for productive studying",
      timezone: "utc",
      language: "en",
      maintenanceMode: false,
      allowNewRegistrations: true,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      sessionReminders: true,
      achievementAlerts: true,
      weeklyReports: false,
    },
    security: {
      twoFactorAuth: true,
      emailVerification: true,
      oauthLogin: true,
      sessionTimeoutMinutes: 60,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      lockoutDurationMinutes: 15,
    },
    email: {
      provider: "resend",
      fromEmail: FROM_EMAIL,
      apiKey: "••••••••••••••••",
      smtpHost: "smtp.resend.com",
      smtpPort: 587,
    },
    appearance: {
      primaryColor: "#8b5cf6",
      defaultTheme: "dark",
      allowThemeToggle: true,
      showLogo: true,
    },
  })

  useEffect(() => {
    const loadSettings = async () => {
      const response = await fetch('/api/admin/settings', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success || !payload?.settings) {
        setMessage(payload?.error ?? 'Unable to load settings')
        return
      }

      setSettings(payload.settings)
      setMessage(null)
    }

    void loadSettings()
  }, [])

  const saveSettings = async () => {
    setIsSaving(true)
    setMessage(null)

    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(payload?.error ?? 'Unable to save settings')
      setIsSaving(false)
      return
    }

    setMessage('Settings saved')
    setIsSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    value={settings.general.siteName}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, siteName: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site-url">Site URL</Label>
                  <Input
                    id="site-url"
                    value={settings.general.siteUrl}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, siteUrl: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Site Description</Label>
                <Textarea
                  id="description"
                  value={settings.general.siteDescription}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, siteDescription: event.target.value },
                    }))
                  }
                  rows={3}
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select
                    value={settings.general.timezone}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, timezone: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="gmt">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select
                    value={settings.general.language}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, language: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Disable access for all non-admin users
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, maintenanceMode: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow New Registrations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable new user signups
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.allowNewRegistrations}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, allowNewRegistrations: checked },
                      }))
                    }
                  />
                </div>
              </div>
              <Button className="w-fit" onClick={() => void saveSettings()} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure platform-wide notification behavior</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications to users
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, emailNotifications: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, pushNotifications: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the app
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.inAppNotifications}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, inAppNotifications: checked },
                      }))
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-4">
                <h4 className="font-medium">Notification Types</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind users about upcoming sessions
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sessionReminders}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, sessionReminders: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Achievement Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when users earn achievements
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.achievementAlerts}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, achievementAlerts: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Send weekly productivity reports
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, weeklyReports: checked },
                      }))
                    }
                  />
                </div>
              </div>
              <Button className="w-fit" onClick={() => void saveSettings()} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for admin accounts
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, twoFactorAuth: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Require email verification for new accounts
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.emailVerification}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, emailVerification: checked },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>OAuth Login</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow social login (Google, GitHub)
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.oauthLogin}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, oauthLogin: checked },
                      }))
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeoutMinutes}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          sessionTimeoutMinutes: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          maxLoginAttempts: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Password Min Length</Label>
                  <Input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          passwordMinLength: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.security.lockoutDurationMinutes}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          lockoutDurationMinutes: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <Button className="w-fit" onClick={() => void saveSettings()} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure email service settings</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Email Provider</Label>
                  <Select
                    value={settings.email.provider}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        email: { ...prev.email, provider: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        email: { ...prev.email, fromEmail: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.email.apiKey}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      email: { ...prev.email, apiKey: event.target.value },
                    }))
                  }
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={settings.email.smtpHost}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        email: { ...prev.email, smtpHost: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        email: { ...prev.email, smtpPort: Number(event.target.value || 0) },
                      }))
                    }
                  />
                </div>
              </div>
              <Button className="w-fit" onClick={() => void saveSettings()} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>Customize the look and feel of the platform</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={settings.appearance.primaryColor}
                      className="w-12 h-10 p-1"
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, primaryColor: event.target.value },
                        }))
                      }
                    />
                    <Input
                      value={settings.appearance.primaryColor}
                      className="flex-1"
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, primaryColor: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Default Theme</Label>
                  <Select
                    value={settings.appearance.defaultTheme}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          defaultTheme: value as "light" | "dark" | "system",
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Theme Toggle</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users switch between light and dark mode
                  </p>
                </div>
                <Switch
                  checked={settings.appearance.allowThemeToggle}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, allowThemeToggle: checked },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Display the FocusHub logo in the sidebar
                  </p>
                </div>
                <Switch
                  checked={settings.appearance.showLogo}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, showLogo: checked },
                    }))
                  }
                />
              </div>
              <Button className="w-fit" onClick={() => void saveSettings()} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
