-- =====================================================================
-- GastoControl — Migración de seguridad del bucket `receipts`
-- Ejecuta este script en el SQL Editor de Supabase (una sola vez).
--
-- Antes: cualquier visitante podía LISTAR todos los tickets (política
--        "receipts public read" con `using (bucket_id = 'receipts')`) y
--        cualquier usuario autenticado podía subir a cualquier ruta.
-- Después: sin listado anónimo y operaciones limitadas a la carpeta del
--        usuario (`receipts/<user_id>/...`, la que usa la app). El bucket
--        sigue siendo público para que las URLs ya guardadas funcionen.
-- =====================================================================

drop policy if exists "receipts public read" on storage.objects;
drop policy if exists "receipts authenticated insert" on storage.objects;
drop policy if exists "receipts own read" on storage.objects;
drop policy if exists "receipts own insert" on storage.objects;
drop policy if exists "receipts own update" on storage.objects;
drop policy if exists "receipts own delete" on storage.objects;

create policy "receipts own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
