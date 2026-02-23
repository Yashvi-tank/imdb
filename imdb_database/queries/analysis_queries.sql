/* Ratings by Decade */
-- Returns average rating and title counts per decade.
SELECT
  (t.start_year/10)*10 AS decade,
  ROUND(AVG(r.average_rating)::numeric,2) AS avg_rating,
  COUNT(*) AS titles_count
FROM title t
JOIN rating r USING (title_id)
GROUP BY decade
ORDER BY decade;

/* Top Directors by Avg Rating */
-- Directors with ≥5 movies, ordered by highest average rating.
SELECT
  p.primary_name,
  ROUND(AVG(r.average_rating)::numeric,2) AS avg_director_rating,
  COUNT(*) AS movie_count
FROM title_person tp
JOIN person p USING (person_id)
JOIN rating r ON tp.title_id = r.title_id
WHERE tp.category = 'director'
GROUP BY p.primary_name
HAVING COUNT(*) >= 5
ORDER BY avg_director_rating DESC
LIMIT 20;

/* Genre Popularity Over Time */
-- Yearly counts of titles per genre (for time-series charts).
SELECT
  g.name      AS genre,
  t.start_year AS year,
  COUNT(*)    AS titles_count
FROM title t
JOIN title_genre tg USING (title_id)
JOIN genre g USING (genre_id)
GROUP BY g.name, year
ORDER BY g.name, year;

/* (Optional) Writers vs Actors Breakdown */
-- Example: count how many titles each top-10 writer & actor has.
SELECT
  tp.category,
  p.primary_name,
  COUNT(*) AS roles_count
FROM title_person tp
JOIN person p USING (person_id)
WHERE tp.category IN ('writer','actor')
GROUP BY tp.category, p.primary_name
ORDER BY tp.category, roles_count DESC
LIMIT 20;
