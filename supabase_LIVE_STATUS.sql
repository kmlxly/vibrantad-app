-- LIVE STATUS TRACKING
-- 1. Add last_seen column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 2. Notify Schema Reload
NOTIFY pgrst, 'reload config';
