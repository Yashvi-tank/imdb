-- ============================================================
-- IMDb Clone — Database Schema  v2.0
-- ============================================================
-- PostgreSQL 12+
-- Now includes: poster_url, streaming_link, composite indexes
-- ============================================================

-- 1. title: movies, series, episodes, shorts, etc.
CREATE TABLE IF NOT EXISTS title (
  tconst          VARCHAR(12)  PRIMARY KEY,
  title_type      VARCHAR(20)  NOT NULL,
  primary_title   TEXT,
  original_title  TEXT,
  is_adult        BOOLEAN      NOT NULL DEFAULT FALSE,
  start_year      SMALLINT,
  end_year        SMALLINT,
  runtime_minutes INTEGER,
  poster_url      TEXT                              -- TMDB poster cache
);

-- 2. person
CREATE TABLE IF NOT EXISTS person (
  nconst          VARCHAR(12)  PRIMARY KEY,
  primary_name    TEXT         NOT NULL,
  birth_year      SMALLINT,
  death_year      SMALLINT
);

-- 3. episode
CREATE TABLE IF NOT EXISTS episode (
  tconst          VARCHAR(12)  PRIMARY KEY REFERENCES title(tconst) ON DELETE CASCADE,
  parent_tconst   VARCHAR(12)  NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  season_number   SMALLINT,
  episode_number  SMALLINT
);

-- 4. principal: cast & crew
CREATE TABLE IF NOT EXISTS principal (
  tconst          VARCHAR(12)  NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  ordering        SMALLINT     NOT NULL,
  nconst          VARCHAR(12)  NOT NULL REFERENCES person(nconst) ON DELETE CASCADE,
  category        VARCHAR(30)  NOT NULL,
  job             TEXT,
  characters      TEXT,
  PRIMARY KEY (tconst, ordering)
);

-- 5. genre
CREATE TABLE IF NOT EXISTS genre (
  genre_id        SERIAL PRIMARY KEY,
  name            VARCHAR(50) UNIQUE NOT NULL
);

-- 6. title_genre
CREATE TABLE IF NOT EXISTS title_genre (
  tconst          VARCHAR(12) NOT NULL REFERENCES title(tconst) ON DELETE CASCADE,
  genre_id        INTEGER     NOT NULL REFERENCES genre(genre_id) ON DELETE CASCADE,
  PRIMARY KEY (tconst, genre_id)
);

-- 7. rating
CREATE TABLE IF NOT EXISTS rating (
  tconst          VARCHAR(12) PRIMARY KEY REFERENCES title(tconst) ON DELETE CASCADE,
  average_rating  NUMERIC(3,1) NOT NULL,
  num_votes       INTEGER      NOT NULL
);

-- 8. streaming_link: external streaming/watch links
CREATE TABLE IF NOT EXISTS streaming_link (
  tconst          VARCHAR(12) REFERENCES title(tconst) ON DELETE CASCADE,
  platform        VARCHAR(50) NOT NULL,
  url             TEXT        NOT NULL,
  PRIMARY KEY (tconst, platform)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Title lookups
CREATE INDEX IF NOT EXISTS idx_title_type          ON title(title_type);
CREATE INDEX IF NOT EXISTS idx_title_start_year     ON title(start_year);
CREATE INDEX IF NOT EXISTS idx_title_is_adult       ON title(is_adult);
CREATE INDEX IF NOT EXISTS idx_title_primary        ON title(primary_title);

-- Composite indexes for advanced search filter combos
CREATE INDEX IF NOT EXISTS idx_title_type_year      ON title(title_type, start_year);
CREATE INDEX IF NOT EXISTS idx_title_type_adult     ON title(title_type, is_adult);

-- Person lookups
CREATE INDEX IF NOT EXISTS idx_person_name          ON person(primary_name);

-- Principal lookups
CREATE INDEX IF NOT EXISTS idx_principal_tconst     ON principal(tconst);
CREATE INDEX IF NOT EXISTS idx_principal_nconst     ON principal(nconst);
CREATE INDEX IF NOT EXISTS idx_principal_category   ON principal(category);

-- Episode lookups
CREATE INDEX IF NOT EXISTS idx_episode_parent       ON episode(parent_tconst);
CREATE INDEX IF NOT EXISTS idx_episode_season       ON episode(parent_tconst, season_number);

-- Rating lookups & sorting
CREATE INDEX IF NOT EXISTS idx_rating_votes         ON rating(num_votes DESC);
CREATE INDEX IF NOT EXISTS idx_rating_avg           ON rating(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_rating_composite     ON rating(average_rating DESC, num_votes DESC);

-- Genre lookups
CREATE INDEX IF NOT EXISTS idx_title_genre_genre    ON title_genre(genre_id);

-- Streaming
CREATE INDEX IF NOT EXISTS idx_streaming_tconst     ON streaming_link(tconst);

-- Full-text search (trigram) — uncomment if pg_trgm is available:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_title_search ON title USING gin(primary_title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_person_search ON person USING gin(primary_name gin_trgm_ops);
