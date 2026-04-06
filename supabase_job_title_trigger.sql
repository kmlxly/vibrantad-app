-- Run this in your Supabase SQL Editor to update the trigger function

-- 1. Ensure the 'job_title' column exists in 'profiles' (just in case)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT 'Staff';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'userid';

-- 2. Update the trigger function to capture 'job_title' and 'role' from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, job_title)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'userid'),
    COALESCE(new.raw_user_meta_data->>'job_title', 'Staff') -- Capture job_title here
  );
  return new;
END;
$$;

-- 3. Ensure the trigger is active (it usually is, but re-asserting doesn't hurt)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
