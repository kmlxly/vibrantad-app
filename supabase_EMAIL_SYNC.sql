-- KEMASKINI PROFILES UNTUK EMAIL NOTIFIKASI
-- Jalankan ini di SQL Editor Supabase

-- 1. Tambah kolum email dalam profiles jika belum ada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Kemaskini fungsi trigger untuk simpan email sekali
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, job_title, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'userid'),
    COALESCE(new.raw_user_meta_data->>'job_title', 'Staff'),
    new.email -- Simpan email dari auth.users
  );
  return new;
END;
$$;

-- 3. Kemaskini data sedia ada (pilihan tapi digalakkan)
-- Nota: Query ini hanya akan berfungsi jika dijalankan oleh superuser atau melalui SQL Editor
UPDATE public.profiles p
SET email = (SELECT email FROM auth.users u WHERE u.id = p.id)
WHERE p.email IS NULL;
