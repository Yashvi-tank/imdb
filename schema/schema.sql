-- ============================================================
-- IMDb Clone — Database Schema
-- ============================================================
-- Designed for PostgreSQL 12+
-- All IDs use IMDb native identifiers (tconst, nconst) as
-- primary lookup keys for simplicity and import compatibility.
-- ============================================================

-- 1. title: movies, series, episodes, shorts, etc.
CREATE TABLE IF NOT EXISTS title (
  tconst          VARCHAR(12)  PRIMARY KEY,
  title_type      VARCHAR(20)  NOT NULL,        -- movie, short, tvSeries, tvEpisode, etc.
  primary_title   TEXT,
  original_title  TEXT,
  is_adult        BOOLEAN      NOT NULL DEFAULT FALSE,
  start_year      SMALLINT,                     -- nullable: some entries have \N
  end_year        SMALLINT,
  runtime_minutes INTEGER
);

-- 2. person: actors, directors, writers, etc.
CREATE TABLE IF NOT EXISTS person (
  nconst          VARCHAR(12)  PRIMARY KEY,
  primary_name    TEXT         NOT NULL,
  birth_year      SMALLINT,
  death_year      SMALLINT
);

-- 3. episode: links tvEpisode titles to their parent tvSeries
CREATE TABLE IF NOT EXISTS episode (
  tconst          VARCHAR(12)  PRIMARY KEY REFERENCES title(tconst) ON DELETE CASCADE,
  parent_tconst   VARCHAR(12)  NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  season_number   SMALLINT,
  episode_number  SMALLINT
);

-- 4. principal: cast & crew assignments (from title.principals.tsv)
CREATE TABLE IF NOT EXISTS principal (
  tconst          VARCHAR(12)  NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  ordering        SMALLINT     NOT NULL,
  nconst          VARCHAR(12)  NOT NULL REFERENCES person(nconst) ON DELETE CASCADE,
  category        VARCHAR(30)  NOT NULL,   -- actor, actress, director, writer, etc.
  job             TEXT,
  characters      TEXT,                    -- JSON array of character names
  PRIMARY KEY (tconst, ordering)
);

-- 5. genre: lookup table for genre names
CREATE TABLE IF NOT EXISTS genre (
  genre_id        SERIAL PRIMARY KEY,
  name            VARCHAR(50) UNIQUE NOT NULL
);

-- 6. title_genre: many-to-many join
CREATE TABLE IF NOT EXISTS title_genre (
  tconst          VARCHAR(12) NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  genre_id        INTEGER     NOT NULL REFERENCES genre(genre_id) ON DELETE CASCADE,
  PRIMARY KEY (tconst, genre_id)
);

-- 7. rating: one rating row per title
CREATE TABLE IF NOT EXISTS rating (
  tconst          VARCHAR(12) PRIMARY KEY REFERENCES title(tconst) ON DELETE CASCADE,
  average_rating  NUMERIC(3,1) NOT NULL,
  num_votes       INTEGER      NOT NULL
);

-- ============================================================
-- INDEXES — for fast lookups, joins, and filtering
-- ============================================================

-- Title lookups
CREATE INDEX IF NOT EXISTS idx_title_type        ON title(title_type);
CREATE INDEX IF NOT EXISTS idx_title_start_year   ON title(start_year);
CREATE INDEX IF NOT EXISTS idx_title_is_adult     ON title(is_adult);
CREATE INDEX IF NOT EXISTS idx_title_primary      ON title(primary_title);

-- Person lookups
CREATE INDEX IF NOT EXISTS idx_person_name        ON person(primary_name);

-- Principal lookups (cast & crew queries)
CREATE INDEX IF NOT EXISTS idx_principal_tconst   ON principal(tconst);
CREATE INDEX IF NOT EXISTS idx_principal_nconst   ON principal(nconst);
CREATE INDEX IF NOT EXISTS idx_principal_category ON principal(category);

-- Episode lookups
CREATE INDEX IF NOT EXISTS idx_episode_parent     ON episode(parent_tconst);

-- Rating lookups & sorting
CREATE INDEX IF NOT EXISTS idx_rating_votes       ON rating(num_votes DESC);
CREATE INDEX IF NOT EXISTS idx_rating_avg         ON rating(average_rating DESC);

-- Genre lookups
CREATE INDEX IF NOT EXISTS idx_title_genre_genre  ON title_genre(genre_id);

-- Full-text search (trigram) — requires pg_trgm extension
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_title_search ON title USING gin(primary_title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_person_search ON person USING gin(primary_name gin_trgm_ops);
