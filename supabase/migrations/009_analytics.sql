-- Migration 009: analytics_events table
-- Stores usage events for product metrics (DAU, imports, conversions)
-- Write-only via service role — users cannot read their own events

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name  text NOT NULL,
  properties  jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- Users cannot read analytics events (write-only via service role)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_no_read" ON public.analytics_events
  FOR SELECT USING (false);

-- Indexes for aggregate queries (DAU, events by name, time range)
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events(created_at);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events(event_name);
CREATE INDEX analytics_events_user_id_idx ON public.analytics_events(user_id);
