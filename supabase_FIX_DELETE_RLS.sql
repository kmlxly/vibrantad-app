-- FIX: TAMBAH POLISI DELETE UNTUK WORKING_REQUESTS
-- Jalankan kod ini di SQL Editor Supabase anda

-- 1. Benarkan staff padam permohonan sendiri ATAU admin padam mana-mana permohonan
DROP POLICY IF EXISTS "Allow users and admins to delete requests" ON working_requests;

CREATE POLICY "Allow users and admins to delete requests" ON working_requests 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (LOWER(profiles.role) = 'admin')
  )
);

-- 2. Pastikan polisi UPDATE juga meliputi admin dengan betul
DROP POLICY IF EXISTS "Allow admin to update status" ON working_requests;

CREATE POLICY "Allow admin to update status" ON working_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (LOWER(profiles.role) = 'admin')
  )
);

-- 3. Refresh cache
NOTIFY pgrst, 'reload config';
