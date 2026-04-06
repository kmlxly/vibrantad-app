-- ENFORCING SINGLE SESSION PER USER
-- 1. Add active_session_id column to profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_id TEXT;

-- 2. Optional: Add an index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_active_session_id ON public.profiles(active_session_id);

-- 3. Ensure RLS allows users to update their own active_session_id
-- Benarkan kakitangan kemaskini profil sendiri untuk simpan sesi aktif
CREATE POLICY "Users can update their own session id" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Benarkan kakitangan melihat data profil (termasuk session_id mereka sendiri)
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Notify Schema Reload
NOTIFY pgrst, 'reload config';
