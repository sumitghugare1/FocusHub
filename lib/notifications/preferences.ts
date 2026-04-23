export type InAppNotificationPreferences = {
  sessionComplete: boolean
  breakReminder: boolean
  streakReminder: boolean
  weeklyReport: boolean
  roomInvites: boolean
  achievements: boolean
}

export type EmailNotificationPreferences = {
  sessionComplete: boolean
  weeklyReport: boolean
  roomInvites: boolean
  achievements: boolean
  marketingEmails: boolean
  productUpdates: boolean
}

export type NotificationPreferences = {
  inApp: InAppNotificationPreferences
  email: EmailNotificationPreferences
}

const defaultNotificationPreferences: NotificationPreferences = {
  inApp: {
    sessionComplete: true,
    breakReminder: true,
    streakReminder: true,
    weeklyReport: true,
    roomInvites: true,
    achievements: true,
  },
  email: {
    sessionComplete: true,
    weeklyReport: true,
    roomInvites: true,
    achievements: true,
    marketingEmails: false,
    productUpdates: true,
  },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    inApp: { ...defaultNotificationPreferences.inApp },
    email: { ...defaultNotificationPreferences.email },
  }
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const raw = isObject(value) ? value : {}
  const email = isObject(raw.email) ? raw.email : {}
  const inApp = isObject(raw.inApp) ? raw.inApp : {}

  return {
    inApp: {
      sessionComplete:
        typeof inApp.sessionComplete === 'boolean'
          ? inApp.sessionComplete
          : defaultNotificationPreferences.inApp.sessionComplete,
      breakReminder:
        typeof inApp.breakReminder === 'boolean'
          ? inApp.breakReminder
          : defaultNotificationPreferences.inApp.breakReminder,
      streakReminder:
        typeof inApp.streakReminder === 'boolean'
          ? inApp.streakReminder
          : defaultNotificationPreferences.inApp.streakReminder,
      weeklyReport:
        typeof inApp.weeklyReport === 'boolean'
          ? inApp.weeklyReport
          : defaultNotificationPreferences.inApp.weeklyReport,
      roomInvites:
        typeof inApp.roomInvites === 'boolean'
          ? inApp.roomInvites
          : defaultNotificationPreferences.inApp.roomInvites,
      achievements:
        typeof inApp.achievements === 'boolean'
          ? inApp.achievements
          : defaultNotificationPreferences.inApp.achievements,
    },
    email: {
      sessionComplete:
        typeof email.sessionComplete === 'boolean'
          ? email.sessionComplete
          : defaultNotificationPreferences.email.sessionComplete,
      weeklyReport:
        typeof email.weeklyReport === 'boolean'
          ? email.weeklyReport
          : defaultNotificationPreferences.email.weeklyReport,
      roomInvites:
        typeof email.roomInvites === 'boolean'
          ? email.roomInvites
          : defaultNotificationPreferences.email.roomInvites,
      achievements:
        typeof email.achievements === 'boolean'
          ? email.achievements
          : defaultNotificationPreferences.email.achievements,
      marketingEmails:
        typeof email.marketingEmails === 'boolean'
          ? email.marketingEmails
          : typeof email.marketing === 'boolean'
            ? email.marketing
            : defaultNotificationPreferences.email.marketingEmails,
      productUpdates:
        typeof email.productUpdates === 'boolean'
          ? email.productUpdates
          : defaultNotificationPreferences.email.productUpdates,
    },
  }
}

export function flattenNotificationPreferences(preferences: unknown) {
  const normalized = normalizeNotificationPreferences(preferences)

  return {
    sessionComplete: normalized.inApp.sessionComplete,
    breakReminder: normalized.inApp.breakReminder,
    streakReminder: normalized.inApp.streakReminder,
    weeklyReport: normalized.inApp.weeklyReport,
    roomInvites: normalized.inApp.roomInvites,
    achievements: normalized.inApp.achievements,
    emailSessionComplete: normalized.email.sessionComplete,
    emailWeeklyReport: normalized.email.weeklyReport,
    emailRoomInvites: normalized.email.roomInvites,
    emailAchievements: normalized.email.achievements,
    marketingEmails: normalized.email.marketingEmails,
    productUpdates: normalized.email.productUpdates,
  }
}
