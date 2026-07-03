-- lanthanides.io contributions inbox: the ONLY database object.
--
-- One table, price contributions only. A row is an entry in the review queue,
-- never published data: a maintainer reviews it and merges accepted
-- observations into the versioned _data/ files as a normal reviewed git PR
-- (CLAUDE.md data strategy). The app only ever INSERTs rows with
-- status 'pending' and SELECTs recent rows for display; status changes
-- ('merged' / 'rejected') are a maintainer step done directly in SQL.
--
-- Idempotent: safe to run repeatedly (npm run db:init).

CREATE TABLE IF NOT EXISTS price_contributions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  element       TEXT NOT NULL,
  form          TEXT NOT NULL,
  purity        TEXT,
  quantity_kg   DOUBLE PRECISION,
  tier          TEXT NOT NULL,
  price         DOUBLE PRECISION NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  unit          TEXT NOT NULL DEFAULT 'kg',
  source_name   TEXT NOT NULL,
  source_url    TEXT,
  observed_date DATE NOT NULL,
  submitted_by  TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
);
