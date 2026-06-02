-- =============================================================================
-- V2: profiles, user_id on players, published on tournaments, result on matches
-- =============================================================================

-- 1. profiles table ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT,
  role  TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player'))
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'player')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile name"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- 2. players: add user_id ---------------------------------------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique ON players(user_id) WHERE user_id IS NOT NULL;

-- Allow authenticated users to read their own player record
DROP POLICY IF EXISTS "Players can read own player record" ON players;
CREATE POLICY "Players can read own player record"
  ON players FOR SELECT TO authenticated
  USING (true);

-- 3. tournaments: add published ---------------------------------------------------
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

-- Players can only see published tournaments
DROP POLICY IF EXISTS "Authenticated users can read tournaments" ON tournaments;
CREATE POLICY "Admins can read all tournaments"
  ON tournaments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR published = true
  );

-- Only admins can insert/update/delete tournaments
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;
CREATE POLICY "Admins can insert tournaments"
  ON tournaments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update tournaments"
  ON tournaments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete tournaments"
  ON tournaments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. tournament_players: player self-enrollment -----------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert tournament_players" ON tournament_players;
DROP POLICY IF EXISTS "Authenticated users can delete tournament_players" ON tournament_players;
CREATE POLICY "Players can enroll themselves"
  ON tournament_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND id = player_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Players can withdraw themselves"
  ON tournament_players FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND id = player_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. matches: replace sets with result --------------------------------------------
ALTER TABLE matches DROP COLUMN IF EXISTS sets;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT NULL;

-- Only admins can insert/update/delete matches
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;
CREATE POLICY "Admins can insert matches"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update matches"
  ON matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete matches"
  ON matches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Auto-create player record on profile creation --------------------------------
CREATE OR REPLACE FUNCTION public.create_player_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'player' THEN
    INSERT INTO public.players (name, ranking, user_id)
    VALUES (COALESCE(NEW.name, 'Nuovo giocatore'), 0, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_player_on_profile();
