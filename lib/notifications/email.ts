import nodemailer from 'nodemailer'

type SendNotificationEmailArgs = {
  to: string
  subject: string
  headline: string
  preheader?: string
  bodyLines: string[]
  cta?: {
    label: string
    url: string
  }
  footer?: string
}

type SendEmailResult = {
  sent: boolean
  messageId?: string
  error?: string
}

type EmailConfigIssue = {
  field: string
  message: string
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null

function normalizeAppPassword(value: string | undefined) {
  return value?.replace(/\s+/g, '').trim() ?? ''
}

function getEmailConfigIssues(): EmailConfigIssue[] {
  const issues: EmailConfigIssue[] = []

  const fromName = process.env.SMTP_FROM_NAME?.trim() || process.env.NEXT_PUBLIC_SITE_NAME?.trim()
  const service = process.env.SMTP_SERVICE?.trim()
  const host = process.env.SMTP_HOST?.trim()
  const portValue = process.env.SMTP_PORT?.trim()
  const port = Number(portValue ?? '587')
  const user = process.env.SMTP_USER?.trim()
  const pass = normalizeAppPassword(process.env.SMTP_PASSWORD)
  const isGmail = service === 'gmail' || host === 'smtp.gmail.com'
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || process.env.NEXT_PUBLIC_FROM_EMAIL?.trim() || user

  if (!fromEmail && !isGmail) {
    issues.push({
      field: 'SMTP_FROM_EMAIL',
      message: 'Set SMTP_FROM_EMAIL to the sender address or use the Gmail inbox in SMTP_USER.',
    })
  }

  if (!fromName) {
    issues.push({
      field: 'SMTP_FROM_NAME',
      message: 'Set SMTP_FROM_NAME so outbound mail shows a friendly sender name.',
    })
  }

  if (!service && !host) {
    issues.push({
      field: 'SMTP_HOST',
      message: 'Set SMTP_HOST to smtp.gmail.com or use SMTP_SERVICE=gmail.',
    })
  }

  if (Number.isNaN(port) || port <= 0) {
    issues.push({
      field: 'SMTP_PORT',
      message: 'Set SMTP_PORT to 587 for Gmail App Password SMTP.',
    })
  }

  if (!user) {
    issues.push({
      field: 'SMTP_USER',
      message: 'Set SMTP_USER to the Gmail inbox address.',
    })
  }

  if (!pass) {
    issues.push({
      field: 'SMTP_PASSWORD',
      message: 'Set SMTP_PASSWORD to a Google App Password. Spaces will be ignored.',
    })
  }

  return issues
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getFromAddress() {
  const service = process.env.SMTP_SERVICE?.trim()
  const host = process.env.SMTP_HOST?.trim()
  const gmailUser = process.env.SMTP_USER?.trim()
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || process.env.NEXT_PUBLIC_FROM_EMAIL?.trim() || gmailUser
  const fromName = process.env.SMTP_FROM_NAME?.trim() || process.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'FocusHub'
  const isGmail = service === 'gmail' || host === 'smtp.gmail.com'

  if (!fromEmail || (isGmail && !gmailUser)) {
    return null
  }

  return `${fromName} <${isGmail && gmailUser ? gmailUser : fromEmail}>`
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter
  }

  const service = process.env.SMTP_SERVICE?.trim()
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER?.trim()
  const pass = normalizeAppPassword(process.env.SMTP_PASSWORD)

  if (!service && (!host || Number.isNaN(port) || port <= 0)) {
    return null
  }

  const transportConfig = service
    ? {
        service,
        auth: user && pass ? { user, pass } : undefined,
      }
    : {
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: user && pass ? { user, pass } : undefined,
      }

  cachedTransporter = nodemailer.createTransport(transportConfig)

  return cachedTransporter
}

function renderEmailMarkup({ headline, preheader, bodyLines, cta, footer }: Omit<SendNotificationEmailArgs, 'to' | 'subject'>) {
  const paragraphMarkup = bodyLines
    .map((line) => `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join('')

  const ctaMarkup = cta
    ? `<tr><td style="padding-top:12px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${escapeHtml(cta.label)}</a></td></tr>`
    : ''

  const footerMarkup = footer
    ? `<p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.5;">${escapeHtml(footer)}</p>`
    : ''

  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 0;">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#e2e8f0;color:#0f172a;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">FocusHub</div>
          <h1 style="margin:18px 0 10px;color:#0f172a;font-size:28px;line-height:1.2;">${escapeHtml(headline)}</h1>
          ${preheader ? `<p style="margin:0 0 22px;color:#64748b;font-size:14px;line-height:1.5;">${escapeHtml(preheader)}</p>` : ''}
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;padding:0 28px 28px;">
          <tr><td>${paragraphMarkup}</td></tr>
          ${ctaMarkup}
          <tr><td>${footerMarkup}</td></tr>
        </table>
      </div>
    </div>
  `
}

function renderPlainText({ headline, preheader, bodyLines, cta, footer }: Omit<SendNotificationEmailArgs, 'to' | 'subject'>) {
  const lines = [headline, preheader, '', ...bodyLines]
  if (cta) {
    lines.push('', `${cta.label}: ${cta.url}`)
  }
  if (footer) {
    lines.push('', footer)
  }
  return lines.filter(Boolean).join('\n')
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`
    result = result.replaceAll(placeholder, value)
  })
  return result
}

type SendCampaignEmailArgs = {
  to: string
  subject: string
  htmlContent: string
  plainTextContent?: string
  variables?: Record<string, string>
}

async function sendCampaignEmail(args: SendCampaignEmailArgs): Promise<SendEmailResult> {
  const transporter = getTransporter()
  const from = getFromAddress()

  if (!transporter || !from) {
    return { sent: false, error: 'Email service is not configured' }
  }

  const variables = args.variables ?? {}
  const subject = substituteVariables(args.subject, variables)
  const html = substituteVariables(args.htmlContent, variables)
  const text = args.plainTextContent ? substituteVariables(args.plainTextContent, variables) : undefined

  const body = {
    from,
    to: args.to,
    subject,
    html,
    text,
  }

  try {
    const result = await transporter.sendMail(body)
    return { sent: true, messageId: result.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send email'
    if (message.includes('535-5.7.8') || message.includes('BadCredentials') || message.includes('Username and Password not accepted')) {
      return {
        sent: false,
        error:
          'Gmail rejected the SMTP login. Use the Google App Password from the same Gmail account in SMTP_USER, with 2-Step Verification enabled. The app password can be pasted with or without spaces.',
      }
    }
    return { sent: false, error: message }
  }
}

async function sendEmail(args: SendNotificationEmailArgs): Promise<SendEmailResult> {
  const transporter = getTransporter()
  const from = getFromAddress()

  if (!transporter || !from) {
    return { sent: false, error: 'Email service is not configured' }
  }

  const body = {
    from,
    to: args.to,
    subject: args.subject,
    html: renderEmailMarkup(args),
    text: renderPlainText(args),
  }

  try {
    const result = await transporter.sendMail(body)
    return { sent: true, messageId: result.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send email'
    if (message.includes('535-5.7.8') || message.includes('BadCredentials') || message.includes('Username and Password not accepted')) {
      return {
        sent: false,
        error:
          'Gmail rejected the SMTP login. Use the Google App Password from the same Gmail account in SMTP_USER, with 2-Step Verification enabled. The app password can be pasted with or without spaces.',
      }
    }
    return { sent: false, error: message }
  }
}

export function isEmailConfigured() {
  return Boolean(getTransporter() && getFromAddress())
}

export function getEmailConfigurationStatus() {
  const issues = getEmailConfigIssues()

  return {
    configured: issues.length === 0,
    issues,
  }
}

export async function sendSessionCompleteEmail(args: {
  to: string
  userName: string
  durationMinutes: number
  sessionType: 'focus' | 'short_break' | 'long_break'
  xpEarned: number
  streak: number
  dashboardUrl: string
}) {
  const label = args.sessionType === 'focus' ? 'focus session' : args.sessionType === 'short_break' ? 'short break' : 'long break'

  return sendEmail({
    to: args.to,
    subject: `Your ${label} is complete`,
    headline: `Nice work, ${args.userName}`,
    preheader: `Your ${label} ended and your study progress is saved.`,
    bodyLines: [
      `You completed a ${args.durationMinutes}-minute ${label}.`,
      `You earned ${args.xpEarned} XP and you are now on a ${args.streak}-day streak.`,
      'Open your dashboard to review your activity and plan the next session.',
    ],
    cta: {
      label: 'Open dashboard',
      url: args.dashboardUrl,
    },
    footer: 'If you did not expect this email, you can review your notification settings in FocusHub.',
  })
}

export async function sendTestNotificationEmail(args: {
  to: string
  userName: string
  dashboardUrl: string
}) {
  return sendEmail({
    to: args.to,
    subject: 'FocusHub test notification',
    headline: `Hello, ${args.userName}`,
    preheader: 'This is a test of the Nodemailer notification system.',
    bodyLines: [
      'Your email delivery pipeline is configured correctly.',
      'Future study reminders, session summaries, and account notifications will use the same mailer.',
    ],
    cta: {
      label: 'View dashboard',
      url: args.dashboardUrl,
    },
    footer: 'This message was sent from the FocusHub notification test endpoint.',
  })
}

export async function sendCoachNudgeEmail(args: {
  to: string
  userName: string
  title: string
  message: string
  action: string
  dashboardUrl: string
}) {
  return sendEmail({
    to: args.to,
    subject: args.title,
    headline: `Hi ${args.userName}, quick study nudge`,
    preheader: args.title,
    bodyLines: [args.message, `Suggested action: ${args.action}`],
    cta: {
      label: 'Open AI Coach',
      url: args.dashboardUrl,
    },
    footer: 'You can manage these reminders in your FocusHub notification settings.',
  })
}

export { sendCampaignEmail, substituteVariables }
