'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Edit2, Eye } from 'lucide-react'

type EmailTemplate = {
  id: string
  name: string
  description?: string
  subject: string
  htmlContent: string
  plainTextContent?: string
  createdAt: string
  updatedAt: string
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    htmlContent: '',
    plainTextContent: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/email-templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      alert('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        setTemplates([data.template, ...templates])
        setFormData({ name: '', description: '', subject: '', htmlContent: '', plainTextContent: '' })
        setShowCreateDialog(false)
      } else {
        alert(data.error || 'Failed to create template')
      }
    } catch (e) {
      alert('Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setTemplates(templates.filter((t) => t.id !== id))
      } else {
        alert(data.error || 'Failed to delete template')
      }
    } catch (e) {
      alert('Failed to delete template')
    }
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="mb-4">Create New Template</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a reusable email template with support for variables like {'{{'} username {'}}'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Report"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of this template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g., Your Weekly Study Report"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="html">HTML Content *</Label>
              <Textarea
                id="html"
                placeholder="HTML content. Use {{variable}} for substitution"
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Available variables: {'{{username}}'}, {'{{level}}'}, {'{{streak}}'}, {'{{dashboardUrl}}'}
              </div>
            </div>
            <div>
              <Label htmlFor="text">Plain Text Content</Label>
              <Textarea
                id="text"
                placeholder="Plain text version (optional)"
                value={formData.plainTextContent}
                onChange={(e) => setFormData({ ...formData, plainTextContent: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No templates yet. Create your first email template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewTemplate(template)
                        setShowPreviewDialog(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Subject:</span>
                    <p className="text-sm text-muted-foreground">{template.subject}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Created:</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showPreviewDialog && previewTemplate && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate.name}</DialogTitle>
              <DialogDescription>Subject: {previewTemplate.subject}</DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
