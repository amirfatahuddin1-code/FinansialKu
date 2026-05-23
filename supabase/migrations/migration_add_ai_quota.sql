-- Tambah kolom ai_quota dan last_ai_reset ke tabel profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_quota INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS last_ai_reset TEXT;
