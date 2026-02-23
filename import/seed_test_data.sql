-- ============================================================
-- IMDb Clone — Seed Test Data
-- ============================================================
-- Small dataset for quick development/testing without importing
-- the full IMDb TSV files.
-- Run: psql -d imdb_clone -f import/seed_test_data.sql
-- ============================================================

-- Clear existing data (order matters for FK constraints)
TRUNCATE principal, title_genre, rating, episode, title, person, genre CASCADE;

-- ── Genres ──
INSERT INTO genre (name) VALUES
  ('Drama'), ('Action'), ('Comedy'), ('Sci-Fi'), ('Crime'),
  ('Thriller'), ('Romance'), ('Adventure'), ('Animation'), ('Fantasy');

-- ── Titles ──
INSERT INTO title (tconst, title_type, primary_title, original_title, is_adult, start_year, end_year, runtime_minutes) VALUES
  ('tt0111161', 'movie',    'The Shawshank Redemption',    'The Shawshank Redemption',    false, 1994, NULL, 142),
  ('tt0068646', 'movie',    'The Godfather',               'The Godfather',               false, 1972, NULL, 175),
  ('tt0468569', 'movie',    'The Dark Knight',             'The Dark Knight',             false, 2008, NULL, 152),
  ('tt0108052', 'movie',    'Schindler''s List',           'Schindler''s List',           false, 1993, NULL, 195),
  ('tt0137523', 'movie',    'Fight Club',                  'Fight Club',                  false, 1999, NULL, 139),
  ('tt0109830', 'movie',    'Forrest Gump',                'Forrest Gump',                false, 1994, NULL, 142),
  ('tt0133093', 'movie',    'The Matrix',                  'The Matrix',                  false, 1999, NULL, 136),
  ('tt0120737', 'movie',    'The Lord of the Rings: The Fellowship of the Ring', 'The Lord of the Rings: The Fellowship of the Ring', false, 2001, NULL, 178),
  ('tt0167260', 'movie',    'The Lord of the Rings: The Return of the King', 'The Lord of the Rings: The Return of the King', false, 2003, NULL, 201),
  ('tt0110912', 'movie',    'Pulp Fiction',                'Pulp Fiction',                false, 1994, NULL, 154),
  ('tt0060196', 'movie',    'The Good, the Bad and the Ugly', 'Il buono, il brutto, il cattivo', false, 1966, NULL, 178),
  ('tt0080684', 'movie',    'Star Wars: Episode V',         'Star Wars: Episode V - The Empire Strikes Back', false, 1980, NULL, 124),
  ('tt0114369', 'movie',    'Se7en',                       'Se7en',                       false, 1995, NULL, 127),
  ('tt0076759', 'movie',    'Star Wars: Episode IV',        'Star Wars',                   false, 1977, NULL, 121),
  ('tt0816692', 'movie',    'Interstellar',                'Interstellar',                false, 2014, NULL, 169),
  -- Series
  ('tt0903747', 'tvSeries', 'Breaking Bad',                'Breaking Bad',                false, 2008, 2013, 49),
  ('tt0944947', 'tvSeries', 'Game of Thrones',             'Game of Thrones',             false, 2011, 2019, 57),
  ('tt7366338', 'tvSeries', 'Chernobyl',                   'Chernobyl',                   false, 2019, 2019, 330),
  -- Episodes (Breaking Bad S1)
  ('tt0959621', 'tvEpisode','Pilot',                       'Pilot',                       false, 2008, NULL, 58),
  ('tt1054724', 'tvEpisode','Cat''s in the Bag...',        'Cat''s in the Bag...',        false, 2008, NULL, 48),
  ('tt1054725', 'tvEpisode','...And the Bag''s in the River','...And the Bag''s in the River', false, 2008, NULL, 48);

-- ── Episodes linkage ──
INSERT INTO episode (tconst, parent_tconst, season_number, episode_number) VALUES
  ('tt0959621', 'tt0903747', 1, 1),
  ('tt1054724', 'tt0903747', 1, 2),
  ('tt1054725', 'tt0903747', 1, 3);

-- ── People ──
INSERT INTO person (nconst, primary_name, birth_year, death_year) VALUES
  ('nm0000151', 'Morgan Freeman',     1937, NULL),
  ('nm0000209', 'Tim Robbins',        1958, NULL),
  ('nm0000338', 'Al Pacino',          1940, NULL),
  ('nm0000199', 'Marlon Brando',      1924, 2004),
  ('nm0634240', 'Christopher Nolan',  1970, NULL),
  ('nm0000288', 'Christian Bale',     1974, NULL),
  ('nm0186505', 'Frank Darabont',     1959, NULL),
  ('nm0000233', 'Quentin Tarantino', 1963, NULL),
  ('nm0186344', 'Bryan Cranston',     1956, NULL),
  ('nm0348152', 'Anna Gunn',          1968, NULL),
  ('nm0000184', 'Steven Spielberg',   1946, NULL),
  ('nm0000229', 'Liam Neeson',        1952, NULL),
  ('nm0000093', 'Brad Pitt',          1963, NULL),
  ('nm0000158', 'Tom Hanks',          1956, NULL),
  ('nm0000206', 'Keanu Reeves',       1964, NULL),
  ('nm0000704', 'Francis Ford Coppola', 1939, NULL);

-- ── Ratings ──
INSERT INTO rating (tconst, average_rating, num_votes) VALUES
  ('tt0111161', 9.3, 2800000),
  ('tt0068646', 9.2, 1900000),
  ('tt0468569', 9.0, 2700000),
  ('tt0108052', 9.0, 1400000),
  ('tt0137523', 8.8, 2200000),
  ('tt0109830', 8.8, 2100000),
  ('tt0133093', 8.7, 2000000),
  ('tt0120737', 8.9, 1900000),
  ('tt0167260', 9.0, 1800000),
  ('tt0110912', 8.9, 2100000),
  ('tt0060196', 8.8, 780000),
  ('tt0080684', 8.7, 1300000),
  ('tt0114369', 8.6, 1700000),
  ('tt0076759', 8.6, 1400000),
  ('tt0816692', 8.7, 1900000),
  ('tt0903747', 9.5, 2100000),
  ('tt0944947', 9.2, 2100000),
  ('tt7366338', 9.4, 800000),
  ('tt0959621', 9.0, 45000),
  ('tt1054724', 8.5, 30000),
  ('tt1054725', 8.3, 28000);

-- ── Principals (cast & crew) ──
INSERT INTO principal (tconst, ordering, nconst, category, job, characters) VALUES
  -- Shawshank
  ('tt0111161', 1, 'nm0000209', 'actor',    NULL, '["Andy Dufresne"]'),
  ('tt0111161', 2, 'nm0000151', 'actor',    NULL, '["Ellis Boyd ''Red'' Redding"]'),
  ('tt0111161', 3, 'nm0186505', 'director', NULL, NULL),
  -- Godfather
  ('tt0068646', 1, 'nm0000199', 'actor',    NULL, '["Don Vito Corleone"]'),
  ('tt0068646', 2, 'nm0000338', 'actor',    NULL, '["Michael Corleone"]'),
  ('tt0068646', 3, 'nm0000704', 'director', NULL, NULL),
  -- Dark Knight
  ('tt0468569', 1, 'nm0000288', 'actor',    NULL, '["Bruce Wayne"]'),
  ('tt0468569', 2, 'nm0634240', 'director', NULL, NULL),
  -- Pulp Fiction
  ('tt0110912', 1, 'nm0000233', 'director', NULL, NULL),
  ('tt0110912', 2, 'nm0000093', 'actor',    NULL, '["Tyler Durden"]'),
  -- Interstellar
  ('tt0816692', 1, 'nm0634240', 'director', NULL, NULL),
  -- Breaking Bad
  ('tt0903747', 1, 'nm0186344', 'actor',    NULL, '["Walter White"]'),
  ('tt0903747', 2, 'nm0348152', 'actress',  NULL, '["Skyler White"]'),
  -- Schindler's List
  ('tt0108052', 1, 'nm0000184', 'director', NULL, NULL),
  ('tt0108052', 2, 'nm0000229', 'actor',    NULL, '["Oskar Schindler"]'),
  -- Episodes
  ('tt0959621', 1, 'nm0186344', 'actor',    NULL, '["Walter White"]'),
  ('tt1054724', 1, 'nm0186344', 'actor',    NULL, '["Walter White"]'),
  ('tt1054725', 1, 'nm0186344', 'actor',    NULL, '["Walter White"]');

-- ── Title-Genre links ──
INSERT INTO title_genre (tconst, genre_id) VALUES
  ('tt0111161', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0068646', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0068646', (SELECT genre_id FROM genre WHERE name='Crime')),
  ('tt0468569', (SELECT genre_id FROM genre WHERE name='Action')),
  ('tt0468569', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0468569', (SELECT genre_id FROM genre WHERE name='Crime')),
  ('tt0108052', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0137523', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0109830', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0109830', (SELECT genre_id FROM genre WHERE name='Romance')),
  ('tt0133093', (SELECT genre_id FROM genre WHERE name='Action')),
  ('tt0133093', (SELECT genre_id FROM genre WHERE name='Sci-Fi')),
  ('tt0120737', (SELECT genre_id FROM genre WHERE name='Adventure')),
  ('tt0120737', (SELECT genre_id FROM genre WHERE name='Fantasy')),
  ('tt0167260', (SELECT genre_id FROM genre WHERE name='Adventure')),
  ('tt0167260', (SELECT genre_id FROM genre WHERE name='Fantasy')),
  ('tt0110912', (SELECT genre_id FROM genre WHERE name='Crime')),
  ('tt0110912', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0060196', (SELECT genre_id FROM genre WHERE name='Adventure')),
  ('tt0080684', (SELECT genre_id FROM genre WHERE name='Action')),
  ('tt0080684', (SELECT genre_id FROM genre WHERE name='Sci-Fi')),
  ('tt0114369', (SELECT genre_id FROM genre WHERE name='Crime')),
  ('tt0114369', (SELECT genre_id FROM genre WHERE name='Thriller')),
  ('tt0076759', (SELECT genre_id FROM genre WHERE name='Action')),
  ('tt0076759', (SELECT genre_id FROM genre WHERE name='Sci-Fi')),
  ('tt0816692', (SELECT genre_id FROM genre WHERE name='Sci-Fi')),
  ('tt0816692', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0903747', (SELECT genre_id FROM genre WHERE name='Crime')),
  ('tt0903747', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt0903747', (SELECT genre_id FROM genre WHERE name='Thriller')),
  ('tt0944947', (SELECT genre_id FROM genre WHERE name='Action')),
  ('tt0944947', (SELECT genre_id FROM genre WHERE name='Adventure')),
  ('tt0944947', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt7366338', (SELECT genre_id FROM genre WHERE name='Drama')),
  ('tt7366338', (SELECT genre_id FROM genre WHERE name='Thriller'));
