-- TAMBAH KOLUM LAMPIRAN PADA JADUAL REPORTS
-- Jalankan di SQL Editor Supabase

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Refresh Cache
NOTIFY pgrst, 'reload config';
