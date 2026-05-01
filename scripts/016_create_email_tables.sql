-- FocusHub Database Schema: Email Templates, Campaigns, and Logs
-- Tables for admin-controlled email campaigns with user segmentation and delivery tracking

-- Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON public.email_templates(created_at DESC);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_admin_select ON public.email_templates;
CREATE POLICY email_templates_admin_select ON public.email_templates
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS email_templates_admin_insert ON public.email_templates;
CREATE POLICY email_templates_admin_insert ON public.email_templates
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS email_templates_admin_update ON public.email_templates;
CREATE POLICY email_templates_admin_update ON public.email_templates
  FOR UPDATE USING (public.is_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS email_templates_admin_delete ON public.email_templates;
CREATE POLICY email_templates_admin_delete ON public.email_templates
  FOR DELETE USING (public.is_admin() AND created_by = auth.uid());

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  user_segment_criteria JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'failed')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_template_id ON public.email_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON public.email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_for ON public.email_campaigns(scheduled_for);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_campaigns_admin_select ON public.email_campaigns;
CREATE POLICY email_campaigns_admin_select ON public.email_campaigns
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS email_campaigns_admin_insert ON public.email_campaigns;
CREATE POLICY email_campaigns_admin_insert ON public.email_campaigns
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS email_campaigns_admin_update ON public.email_campaigns;
CREATE POLICY email_campaigns_admin_update ON public.email_campaigns
  FOR UPDATE USING (public.is_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS email_campaigns_admin_delete ON public.email_campaigns;
CREATE POLICY email_campaigns_admin_delete ON public.email_campaigns
  FOR DELETE USING (public.is_admin() AND created_by = auth.uid());

-- Email Campaign Logs Table
CREATE TABLE IF NOT EXISTS public.email_campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_campaign_id ON public.email_campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_user_id ON public.email_campaign_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_status ON public.email_campaign_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_campaign_logs_created_at ON public.email_campaign_logs(created_at DESC);

ALTER TABLE public.email_campaign_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_campaign_logs_admin_select ON public.email_campaign_logs;
CREATE POLICY email_campaign_logs_admin_select ON public.email_campaign_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS email_campaign_logs_admin_insert ON public.email_campaign_logs;
CREATE POLICY email_campaign_logs_admin_insert ON public.email_campaign_logs
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS email_campaign_logs_admin_update ON public.email_campaign_logs;
CREATE POLICY email_campaign_logs_admin_update ON public.email_campaign_logs
  FOR UPDATE USING (public.is_admin());

-- Trigger to update updated_at for email_templates
DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update updated_at for email_campaigns
DROP TRIGGER IF EXISTS email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
