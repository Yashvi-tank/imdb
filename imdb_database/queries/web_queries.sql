

/* Creating performance indexes  */
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_tconst       ON title       (tconst);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_person_nconst      ON person      (nconst);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tp_title           ON title_person(title_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tp_person          ON title_person(person_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_genre_genre  ON title_genre (genre_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rating_title       ON rating      (title_id);


-- Making sure we have an index on tconst
CREATE INDEX IF NOT EXISTS idx_title_tconst ON title(tconst);

-- Testing the query with a literal (change to any real tconst)
EXPLAIN ANALYZE
SELECT
  t.primary_title,
  t.start_year,
  t.runtime_minutes,
  r.average_rating,
  r.num_votes
FROM title AS t
LEFT JOIN rating AS r USING (title_id)
WHERE t.tconst = 'tt0000001';



-- Query 2: Movie Summary (directors & writers)

EXPLAIN ANALYZE
SELECT
  p.primary_name,
  tp.category
FROM title AS t
  JOIN title_person AS tp
    ON tp.title_id  = t.title_id
   AND tp.category IN ('director','writer')
  JOIN person AS p
    ON p.person_id = tp.person_id
WHERE t.tconst = 'tt0000001';


-- Query 3: Movie Summary (top-5 cast)

EXPLAIN ANALYZE
SELECT
  p.primary_name,
  tp.job,
  tp.ordering
FROM title AS t
  JOIN title_person AS tp
    ON tp.title_id   = t.title_id
   AND tp.category  = 'actor'
  JOIN person AS p
    ON p.person_id = tp.person_id
WHERE t.tconst = 'tt0000001'
ORDER BY tp.ordering
LIMIT 5;


-- Query 4: Movie Details (all cast & crew, ordered)

EXPLAIN ANALYZE
SELECT
  tp.category,
  p.primary_name,
  tp.job,
  tp.characters
FROM title AS t
  JOIN title_person AS tp
    ON tp.title_id = t.title_id
  JOIN person AS p
    ON p.person_id = tp.person_id
WHERE t.tconst = 'tt0000001'
ORDER BY
     (tp.category = 'director') DESC  -- directors first
   , (tp.category = 'writer')   DESC  -- then writers
   , (tp.category = 'actor')    DESC  -- then actors
   , tp.ordering;

-- Query 5: Listing by Genre + Filters (page listing)

EXPLAIN ANALYZE
SELECT
  t.title_id,
  t.primary_title,
  t.start_year,
  r.average_rating
FROM title AS t
  JOIN rating       AS r  USING (title_id)
  JOIN title_genre  AS tg USING (title_id)
  JOIN genre        AS g  USING (genre_id)
WHERE g.name           = 'Comedy'         -- replace with :genre
  AND t.start_year    BETWEEN 1990 AND 2000 -- :year_min, :year_max
  AND r.average_rating >= 7.5              -- :min_rating
ORDER BY r.average_rating DESC
LIMIT 50;