ALTER TABLE tournaments
  DROP CONSTRAINT IF EXISTS tournaments_category_check;

UPDATE tournaments
SET category = CASE category
  WHEN 'singles' THEN 'maschile'
  WHEN 'doubles' THEN 'femminile'
  ELSE category
END
WHERE category IN ('singles', 'doubles');

ALTER TABLE tournaments
  ALTER COLUMN category SET DEFAULT 'maschile';

ALTER TABLE tournaments
  ADD CONSTRAINT tournaments_category_check
  CHECK (category IN ('maschile', 'femminile')) NOT VALID;

ALTER TABLE tournaments
  VALIDATE CONSTRAINT tournaments_category_check;
