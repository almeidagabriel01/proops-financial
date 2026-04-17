CREATE TABLE health_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  savings_rate_score integer NOT NULL,
  budget_compliance_score integer NOT NULL,
  goals_progress_score integer NOT NULL,
  diversification_score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage their own health scores"
  ON health_score_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
