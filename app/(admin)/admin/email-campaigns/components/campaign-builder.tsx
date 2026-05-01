'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2, Send, ChevronRight, ChevronLeft } from 'lucide-react'

type EmailTemplate = {
  id: string
  name: string
  description?: string
  subject: string
  htmlContent: string
}

type SegmentUser = {
  id: string
  email: string
  full_name: string
  level: number
  current_streak: number
}

type CampaignBuilderProps = {
  onCampaignSent: () => void
}

export default function CampaignBuilder({ onCampaignSent }: CampaignBuilderProps) {
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [segmentCriteria, setSegmentCriteria] = useState({
    tiers: [] as string[],
    activityStatus: [] as string[],
    streakMinimum: 0,
    respectPreferences: true,
  })

  // Preview state
  const [previewData, setPreviewData] = useState<{
    segmentCount: number
    sampleRecipients: SegmentUser[]
  } | null>(null)

  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    message: string
    details?: { total: number; sent: number; failed: number }
  } | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch('/api/admin/email-templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!selectedTemplate || !campaignName) {
      alert('Please select a template and enter campaign name')
      return
    }

    setIsCreatingCampaign(true)
    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          name: campaignName,
          description: campaignDescription,
          userSegmentCriteria: segmentCriteria,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setCampaignId(data.campaign.id)
        setPreviewData({
          segmentCount: data.segmentCount,
          sampleRecipients: data.sampleRecipients,
        })
        setStep(3)
      } else {
        alert(data.error || 'Failed to create campaign')
      }
    } catch (e) {
      alert('Failed to create campaign')
    } finally {
      setIsCreatingCampaign(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!campaignId) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/send`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        setSendResult({
          success: true,
          message: `Campaign sent successfully!`,
          details: {
            total: data.results.total,
            sent: data.results.sent,
            failed: data.results.failed,
          },
        })
        setStep(4)
        onCampaignSent()
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to send campaign',
        })
      }
    } catch (e) {
      setSendResult({
        success: false,
        message: 'Failed to send campaign',
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoadingTemplates) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading templates...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-success text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 ${s < step ? 'bg-success' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Template */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Email Template</CardTitle>
            <CardDescription>Choose a template to base this campaign on</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground">
                  No templates available. Create one first in the Email Templates section.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">{template.description}</CardDescription>
                          )}
                        </div>
                        <Checkbox checked={selectedTemplate === template.id} />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">Subject: {template.subject}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Button onClick={() => setStep(2)} disabled={!selectedTemplate} className="w-full">
              Next: Configure Audience <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Segment */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Audience</CardTitle>
            <CardDescription>
              Define which users should receive this campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-base">
                Campaign Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Engagement Boost"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-base">
                Description (optional)
              </Label>
              <Input
                id="description"
                placeholder="What is this campaign about?"
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base mb-3 block">User Tiers</Label>
                <div className="space-y-2">
                  {['free', 'pro', 'premium'].map((tier) => (
                    <div key={tier} className="flex items-center gap-2">
                      <Checkbox
                        id={`tier-${tier}`}
                        checked={segmentCriteria.tiers.includes(tier)}
                        onCheckedChange={(checked) => {
                          setSegmentCriteria({
                            ...segmentCriteria,
                            tiers: checked
                              ? [...segmentCriteria.tiers, tier]
                              : segmentCriteria.tiers.filter((t) => t !== tier),
                          })
                        }}
                      />
                      <Label htmlFor={`tier-${tier}`} className="capitalize cursor-pointer">
                        {tier}
                      </Label>
                    </div>
                  ))}
                </div>
                {segmentCriteria.tiers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">At least one tier should be selected</p>
                )}
              </div>

              <div>
                <Label className="text-base mb-3 block">Activity Status</Label>
                <div className="space-y-2">
                  {['active', 'inactive'].map((status) => (
                    <div key={status} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={segmentCriteria.activityStatus.includes(status)}
                        onCheckedChange={(checked) => {
                          setSegmentCriteria({
                            ...segmentCriteria,
                            activityStatus: checked
                              ? [...segmentCriteria.activityStatus, status]
                              : segmentCriteria.activityStatus.filter((s) => s !== status),
                          })
                        }}
                      />
                      <Label htmlFor={`status-${status}`} className="capitalize cursor-pointer">
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
                {segmentCriteria.activityStatus.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">At least one status should be selected</p>
                )}
              </div>

              <div>
                <Label htmlFor="streak" className="text-base">
                  Minimum Streak Days
                </Label>
                <Input
                  id="streak"
                  type="number"
                  min="0"
                  max="365"
                  value={segmentCriteria.streakMinimum}
                  onChange={(e) =>
                    setSegmentCriteria({
                      ...segmentCriteria,
                      streakMinimum: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="preferences"
                  checked={segmentCriteria.respectPreferences}
                  onCheckedChange={(checked) =>
                    setSegmentCriteria({
                      ...segmentCriteria,
                      respectPreferences: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="preferences" className="cursor-pointer">
                  Respect user notification preferences
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleCreateCampaign} disabled={isCreatingCampaign} className="flex-1">
                {isCreatingCampaign ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing...
                  </>
                ) : (
                  <>
                    Next: Review <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Preview */}
      {step === 3 && previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Send</CardTitle>
            <CardDescription>
              Review your campaign details and recipient list before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Campaign Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{campaignName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Template:</span>
                    <p className="font-medium">{selectedTemplate}</p>
                  </div>
                  {campaignDescription && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="font-medium">{campaignDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Recipients</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Recipients:</span>
                    <p className="text-2xl font-bold text-primary">{previewData.segmentCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {previewData.sampleRecipients.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Sample Recipients</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {previewData.sampleRecipients.map((user) => (
                    <div key={user.id} className="text-sm flex justify-between items-center py-1 border-b last:border-0">
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">L{user.level}</Badge>
                        <p className="text-xs text-muted-foreground">{user.current_streak}d streak</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Ready to send?</p>
                <p>This will send {previewData.segmentCount} emails immediately.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSendCampaign} disabled={isSending} className="flex-1">
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Campaign
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && sendResult && (
        <Card>
          <CardHeader>
            <CardTitle>{sendResult.success ? 'Success!' : 'Failed'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center">{sendResult.message}</p>
            {sendResult.details && (
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Recipients</p>
                  <p className="text-2xl font-bold">{sendResult.details.total}</p>
                </div>
                <div className="rounded-lg border p-4 border-green-200 bg-green-50">
                  <p className="text-sm text-muted-foreground">Successfully Sent</p>
                  <p className="text-2xl font-bold text-green-600">{sendResult.details.sent}</p>
                </div>
                <div className="rounded-lg border p-4 border-red-200 bg-red-50">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{sendResult.details.failed}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                View Campaign History
              </Button>
              <Button onClick={() => {
                setStep(1)
                setCampaignName('')
                setCampaignDescription('')
                setSelectedTemplate(null)
                setSendResult(null)
              }} className="flex-1">
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
