-- Create the 'attachments' bucket if it doesn't exist
-- Note: Insert into storage.buckets requires appropriate permissions
INSERT INTO storage.buckets (id, name, public)
SELECT 'attachments', 'attachments', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'attachments'
);

-- Policy to allow authenticated users to upload files to the 'attachments' bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Policy to allow public access to view files in the 'attachments' bucket
CREATE POLICY "Allow public to view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Policy to allow owners to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());
