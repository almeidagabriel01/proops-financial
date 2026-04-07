-- Garante que o DEFAULT de profiles.plan é 'basic'
-- A migration 003 mudou o check constraint mas não
-- atualizou o DEFAULT da coluna
ALTER TABLE public.profiles
ALTER COLUMN plan SET DEFAULT 'basic';
