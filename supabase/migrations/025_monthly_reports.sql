-- Tabela de relatórios mensais
CREATE TABLE monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  pdf_storage_path text,
  pdf_url text,
  email_sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios relatórios
CREATE POLICY "users can view their own reports"
  ON monthly_reports FOR SELECT
  USING (user_id = auth.uid());

-- Apenas service role pode inserir e atualizar (geração server-side)
CREATE POLICY "service role can manage reports"
  ON monthly_reports FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_monthly_reports_updated_at
  BEFORE UPDATE ON monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Bucket privado para armazenar PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can read their own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Preferência de opt-IN de email mensal
-- DEFAULT false: LGPD — consentimento explícito obrigatório, nunca inscrever por padrão
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_report_email boolean NOT NULL DEFAULT false;
