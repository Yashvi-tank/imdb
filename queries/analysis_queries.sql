-- ============================================================
-- IMDb Clone — Data Analysis Queries
-- ============================================================
-- These queries power the data analysis visualizations.
-- Each is designed to return clean tabular data suitable
-- for pandas DataFrames and matplotlib charts.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Analysis 1: Ratings Trend by Decade
-- ────────────────────────────────────────────────────────────
-- Purpose:  Show how average ratings and title counts evolve
--           across decades (1890s–2020s).
-- Design:   Groups titles by decade using integer division.
--           Joins rating table to get avg rating per decade.
--           Filters out NULL start_year and decades before 1890.
-- Output:   decade, avg_rating, titles_count
-- Chart:    Dual-axis line + bar chart (bar = count, line = avg).
-- ────────────────────────────────────────────────────────────

SELECT
  (t.start_year / 10) * 10 AS decade,
  ROUND(AVG(r.average_rating)::numeric, 2) AS avg_rating,
  COUNT(*) AS titles_count
FROM title t
JOIN rating r ON r.tconst = t.tconst
WHERE t.start_year IS NOT NULL
  AND t.start_year >= 1890
  AND t.title_type IN ('movie', 'tvSeries', 'tvMovie')
GROUP BY decade
ORDER BY decade;


-- ────────────────────────────────────────────────────────────
-- Analysis 2: Top Directors by Average Rating
-- ────────────────────────────────────────────────────────────
-- Purpose:  Find the best-rated directors who have a meaningful
--           body of work (≥5 directed titles with ratings).
-- Design:   Joins principal (director) → rating → person.
--           HAVING COUNT(*) >= 5 ensures statistical significance.
--           Ordered by avg rating DESC, limited to top 20.
-- Output:   primary_name, avg_director_rating, movie_count
-- Chart:    Horizontal bar chart of directors vs avg rating.
-- ────────────────────────────────────────────────────────────

SELECT
  p.primary_name,
  ROUND(AVG(r.average_rating)::numeric, 2) AS avg_director_rating,
  COUNT(*) AS movie_count
FROM principal pr
JOIN person p ON p.nconst = pr.nconst
JOIN rating r ON r.tconst = pr.tconst
WHERE pr.category = 'director'
GROUP BY p.primary_name
HAVING COUNT(*) >= 5
ORDER BY avg_director_rating DESC
LIMIT 20;


-- ────────────────────────────────────────────────────────────
-- Analysis 3: Genre Popularity Over Time
-- ────────────────────────────────────────────────────────────
-- Purpose:  Track how genres rise and fall in popularity over
--           decades, measured by title count per genre per decade.
-- Design:   Joins title → title_genre → genre, grouped by
--           genre name and decade. Only includes decades 1950+
--           for clarity. Limited to major genres (≥1000 total titles).
-- Output:   genre, decade, titles_count
-- Chart:    Multi-line chart (one line per genre) over decades.
-- ────────────────────────────────────────────────────────────

SELECT
  g.name AS genre,
  (t.start_year / 10) * 10 AS decade,
  COUNT(*) AS titles_count
FROM title t
JOIN title_genre tg ON tg.tconst = t.tconst
JOIN genre g ON g.genre_id = tg.genre_id
WHERE t.start_year IS NOT NULL
  AND t.start_year >= 1950
  AND t.title_type IN ('movie', 'tvSeries', 'tvMovie')
  AND g.name IN (
      SELECT g2.name FROM title_genre tg2
      JOIN genre g2 USING(genre_id)
      GROUP BY g2.name HAVING COUNT(*) >= 1000
  )
GROUP BY g.name, decade
ORDER BY g.name, decade;


-- ────────────────────────────────────────────────────────────
-- Analysis 4 (Bonus): Top Actors by Number of Roles
-- ────────────────────────────────────────────────────────────
-- Purpose:  Identify the most prolific actors across all titles.
-- Design:   Counts distinct titles per actor from principal table.
-- Output:   primary_name, roles_count, avg_rating
-- Chart:    Horizontal bar chart.
-- ────────────────────────────────────────────────────────────

SELECT
  p.primary_name,
  COUNT(DISTINCT pr.tconst) AS roles_count,
  ROUND(AVG(r.average_rating)::numeric, 2) AS avg_rating
FROM principal pr
JOIN person p ON p.nconst = pr.nconst
LEFT JOIN rating r ON r.tconst = pr.tconst
WHERE pr.category IN ('actor', 'actress')
GROUP BY p.primary_name
HAVING COUNT(DISTINCT pr.tconst) >= 20
ORDER BY roles_count DESC
LIMIT 20;
