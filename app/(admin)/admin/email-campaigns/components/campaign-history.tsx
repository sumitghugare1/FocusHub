'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  description?: string
  status: 'draft' | 'pending' | 'sent' | 'failed'
  sent_count: number
  failed_count: number
  created_at: string
  scheduled_for?: string
}

type EmailLog = {
  id: string
  email: string
  status: 'pending' | 'sent' | 'failed'
  errorMessage?: string
  sentAt?: string
  attemptedAt?: string
}

type CampaignHistoryProps = {
  refreshKey: number
}

export default function CampaignHistory({ refreshKey }: CampaignHistoryProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [refreshKey])

  const loadCampaigns = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/email-campaigns')
      const data = await response.json()
      if (data.success) {
        setCampaigns(data.campaigns)
      }
    } catch (e) {
      console.error('Failed to load campaigns:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLogs = async (campaignId: string) => {
    setIsLoadingLogs(true)
    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/logs`)
      const data = await response.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (e) {
      console.error('Failed to load logs:', e)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const handleViewLogs = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    void loadLogs(campaignId)
  }

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-600">Sent</Badge>
      case 'pending':
        return <Badge className="bg-blue-600">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading campaigns...</div>
  }

  if (campaigns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            No campaigns yet. Create your first campaign to see them here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => {
        const totalRecipients = campaign.sent_count + campaign.failed_count
        const successRate = totalRecipients > 0 ? ((campaign.sent_count / totalRecipients) * 100).toFixed(1) : 0

        return (
          <Card key={campaign.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  {campaign.description && (
                    <CardDescription className="mt-1">{campaign.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Recipients</p>
                  <p className="text-xl font-bold">{totalRecipients}</p>
                </div>
                <div className="rounded-lg border p-3 border-green-200 bg-green-50">
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-xl font-bold text-green-700">{campaign.sent_count}</p>
                </div>
                <div className="rounded-lg border p-3 border-red-200 bg-red-50">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold text-red-700">{campaign.failed_count}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-xl font-bold">{successRate}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewLogs(campaign.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Logs Dialog */}
      {selectedCampaignId && (
        <Dialog open={!!selectedCampaignId} onOpenChange={(open) => !open && setSelectedCampaignId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Delivery Details</DialogTitle>
              <DialogDescription>
                View the status of each email sent in this campaign
              </DialogDescription>
            </DialogHeader>

            {isLoadingLogs ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No delivery logs found</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getLogStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-all">{log.email}</p>
                          {log.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {log.sentAt && <p>{new Date(log.sentAt).toLocaleString()}</p>}
                      {log.attemptedAt && !log.sentAt && <p>{new Date(log.attemptedAt).toLocaleString()}</p>}
                      <Badge variant="outline" className="mt-1">
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
