-- 1. title: movies & series
CREATE TABLE title (
  title_id        SERIAL PRIMARY KEY,
  tconst          VARCHAR(20) UNIQUE NOT NULL,
  primary_title   TEXT            NOT NULL,
  original_title  TEXT            NOT NULL,
  is_adult        BOOLEAN         NOT NULL DEFAULT FALSE,
  start_year      SMALLINT        NOT NULL,
  end_year        SMALLINT,
  runtime_minutes INTEGER,
  UNIQUE(tconst)
);

-- 2. person: actors, directors, writers
CREATE TABLE person (
  person_id       SERIAL PRIMARY KEY,
  nconst          VARCHAR(20) UNIQUE NOT NULL,
  primary_name    TEXT            NOT NULL,
  birth_year      SMALLINT,
  death_year      SMALLINT
);

-- 3. title_person: join table for cast & crew
CREATE TABLE title_person (
  title_id       INTEGER    NOT NULL REFERENCES title(title_id) ON DELETE CASCADE,
  person_id      INTEGER    NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  category       VARCHAR(20) NOT NULL,    -- e.g. actor, director
  job            TEXT,                    -- e.g. director role
  characters     TEXT,                    -- JSON/text array of character names
  ordering       SMALLINT,                -- billing order
  PRIMARY KEY(title_id, person_id, category, ordering)
);

-- 4. genre
CREATE TABLE genre (
  genre_id       SERIAL PRIMARY KEY,
  name           VARCHAR(50) UNIQUE NOT NULL
);

-- 5. title_genre: join table
CREATE TABLE title_genre (
  title_id       INTEGER NOT NULL REFERENCES title(title_id) ON DELETE CASCADE,
  genre_id       INTEGER NOT NULL REFERENCES genre(genre_id) ON DELETE CASCADE,
  PRIMARY KEY(title_id, genre_id)
);

-- 6. rating
CREATE TABLE rating (
  title_id       INTEGER PRIMARY KEY REFERENCES title(title_id) ON DELETE CASCADE,
  average_rating NUMERIC(3,1) NOT NULL,
  num_votes      INTEGER       NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX idx_title_primary_title ON title(primary_title);
CREATE INDEX idx_person_name         ON person(primary_name);
CREATE INDEX idx_title_start_year    ON title(start_year);
