-- Matches table for tournament draw results
CREATE TABLE IF NOT EXISTS matches (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round         INTEGER NOT NULL,
  position      INTEGER NOT NULL,
  player1_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  player2_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  sets          JSONB NOT NULL DEFAULT '[]',
  winner_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, round, position)
);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read matches"
  ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert matches"
  ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update matches"
  ON matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete matches"
  ON matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can update tournament_players"
  ON tournament_players FOR UPDATE TO authenticated USING (true);
