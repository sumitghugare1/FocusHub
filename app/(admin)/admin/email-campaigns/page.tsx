'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Plus } from 'lucide-react'
import TemplateManager from './components/template-manager'
import CampaignBuilder from './components/campaign-builder'
import CampaignHistory from './components/campaign-history'

export default function EmailCampaignsPage() {
  const [activeTab, setActiveTab] = useState('templates')
  const [refreshHistory, setRefreshHistory] = useState(0)

  const handleCampaignSent = () => {
    setRefreshHistory((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Email Campaigns</h1>
              <p className="text-muted-foreground">Create and manage bulk email campaigns</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setActiveTab('campaigns')}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Build Campaign</TabsTrigger>
          <TabsTrigger value="history">History & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Email Templates</h2>
                <p className="text-muted-foreground">Manage reusable email templates with variable placeholders</p>
              </div>
              <Button onClick={() => setActiveTab('templates')}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
            <TemplateManager />
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Create Campaign</h2>
              <p className="text-muted-foreground">
                Select a template, define your audience, and send targeted emails
              </p>
            </div>
            <CampaignBuilder onCampaignSent={handleCampaignSent} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Campaign History</h2>
              <p className="text-muted-foreground">View past campaigns and delivery statistics</p>
            </div>
            <CampaignHistory refreshKey={refreshHistory} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
