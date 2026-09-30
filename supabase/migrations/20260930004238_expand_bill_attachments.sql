-- Local migration: retain private immutable attachments and permit eight named slots.
alter policy bills_insert on storage.objects with check (
  bucket_id='boletas' and (select private.current_role()) in ('admin','sales')
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and array_length(storage.foldername(name),1)=2
  and storage.filename(name) in ('frente','reverso','documento-3','documento-4','documento-5','documento-6','documento-7','documento-8')
  and exists(select 1 from public.quotes q where q.id::text=(storage.foldername(name))[2] and q.owner_id=(select auth.uid()))
);
