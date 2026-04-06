-- HR ROLE SETUP
-- 1. Create a policy for HR to VIEW ALL working requests
-- We assume the table is already enabled for RLS

-- Drop existing policies if they conflict (optional, but safer to just ADD a new one if possible, or replace)
-- To be safe, let's create a specific policy for HR

CREATE POLICY "HR can view all working requests"
ON public.working_requests
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'hr'
);

-- Note: Existing policies probably handle Admin and User owners. 
-- This new policy adds specific permission for HR to SELECT everything.

-- 2. Ensure HR is NOT allowed to UPDATE or DELETE by default (unless they own the record)
-- We don't need to do anything here because RLS is "deny by default" unless a policy allows it.
-- As long as we don't add UPDATE/DELETE policies for 'hr', they can't do it.

-- 3. Notify to reload schema cache
NOTIFY pgrst, 'reload config';
