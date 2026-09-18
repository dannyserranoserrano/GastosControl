-- =====================================================================
-- GastoControl — Bucket `receipts` privado (URLs firmadas)
-- Ejecuta en el SQL Editor de Supabase tras `fix_receipts_policies.sql`.
--
-- Al poner el bucket en privado, las antiguas URLs públicas dejan de servir;
-- el frontend obtiene URLs firmadas temporales (createSignedUrl, 1 h) a partir
-- de la ruta de storage. Los registros antiguos que guardaron una URL pública
-- se migran solos en el cliente (se extrae la ruta y se firma).
-- =====================================================================

update storage.buckets set public = false where id = 'receipts';
