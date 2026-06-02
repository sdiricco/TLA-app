-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  format TEXT NOT NULL DEFAULT 'single_elimination'
    CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'round_robin_elimination')),
  category TEXT NOT NULL DEFAULT 'singles'
    CHECK (category IN ('singles', 'doubles')),
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tournament ↔ Player join table
CREATE TABLE IF NOT EXISTS tournament_players (
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID REFERENCES players(id)     ON DELETE CASCADE,
  seed          INTEGER,
  PRIMARY KEY (tournament_id, player_id)
);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tournaments"
  ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tournaments"
  ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tournaments"
  ON tournaments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tournaments"
  ON tournaments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read tournament_players"
  ON tournament_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tournament_players"
  ON tournament_players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tournament_players"
  ON tournament_players FOR DELETE TO authenticated USING (true);
