-- Raise image bucket file size limit from 5MB to 20MB (2K PNGs from AI often exceed 5MB).
-- Run once in Supabase SQL Editor for existing projects.

update storage.buckets
set file_size_limit = 20971520
where id in ('generation-references', 'generated-posters');
