-- Copy dan Paste kod ini ke dalam "SQL Editor" di Dashboard Supabase anda

-- 1. Tambah kolum 'status' dan 'color' ke table 'projects' (Jika belum)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS color text DEFAULT 'neo-yellow';

-- 2. PAKSA Supabase untuk 'Nampak' Kolum Baru (PENTING!)
-- Ini akan refresh cache API supaya error "schema cache" hilang
NOTIFY pgrst, 'reload config';
