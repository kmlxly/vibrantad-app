-- Copy dan Paste kod ini ke dalam "SQL Editor" di Dashboard Supabase anda

-- 1. Buang constraint lama (Check constraint untuk type)
ALTER TABLE working_requests DROP CONSTRAINT IF EXISTS working_requests_type_check;

-- 2. Tambah constraint baru termasuk 'Bercuti'
ALTER TABLE working_requests ADD CONSTRAINT working_requests_type_check 
CHECK (type IN ('WFH', 'Remote', 'Lapangan', 'Bercuti'));

-- 3. Refresh Schema (Optional, Supabase usually handles this)
NOTIFY pgrst, 'reload config';
