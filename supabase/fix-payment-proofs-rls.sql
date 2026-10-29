-- Sketchly: permisos mínimos para subir y revisar comprobantes de Yape.
-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
-- No desactiva RLS ni permite que un cliente lea archivos de otros usuarios.

-- El cliente solo puede subir comprobantes dentro de su propia carpeta:
-- payment-proofs/<auth.uid()>/...
DROP POLICY IF EXISTS "Clients upload own payment proofs" ON storage.objects;
CREATE POLICY "Clients upload own payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- El cliente puede volver a leer sus comprobantes; el administrador puede leerlos todos.
DROP POLICY IF EXISTS "Owners and admins read payment proofs" ON storage.objects;
CREATE POLICY "Owners and admins read payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
);

-- El cliente solo puede reemplazar/eliminar archivos de su propia carpeta.
DROP POLICY IF EXISTS "Clients update own payment proofs" ON storage.objects;
CREATE POLICY "Clients update own payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Clients delete own payment proofs" ON storage.objects;
CREATE POLICY "Clients delete own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
);
