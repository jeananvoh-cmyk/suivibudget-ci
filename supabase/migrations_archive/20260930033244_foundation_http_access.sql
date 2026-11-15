GRANT SELECT ON public.public_documents, public.citizen_proofs TO service_role;

UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'citizen_photos';

-- Storage checks INSERT before populating metadata; the bucket enforces the size limit.
ALTER POLICY "Strict citizen media upload only" ON storage.objects
WITH CHECK (
  bucket_id = 'citizen_photos'
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'])
);
