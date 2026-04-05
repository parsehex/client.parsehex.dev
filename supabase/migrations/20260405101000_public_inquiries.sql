CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  website TEXT,
  message TEXT NOT NULL,
  source_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inquiries_status_created_at_idx
  ON public.inquiries(status, created_at DESC);

CREATE INDEX inquiries_created_at_idx
  ON public.inquiries(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_inquiries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_inquiries_updated_at
BEFORE UPDATE ON public.inquiries
FOR EACH ROW
EXECUTE FUNCTION public.set_inquiries_updated_at();

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage all inquiries"
  ON public.inquiries
  FOR ALL
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());
