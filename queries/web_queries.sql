-- ============================================================
-- IMDb Clone — Web Queries (Documented)
-- ============================================================
-- Each query is used by a backend API endpoint.
-- All queries use parameterized inputs (shown as $1, $2, etc.)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Query 1: Home — Top Rated Titles
-- ────────────────────────────────────────────────────────────
-- Purpose:  Return the 50 highest-rated titles for the home page.
-- Inputs:   $1 = includeAdult (boolean)
-- Output:   tconst, primary_title, start_year, runtime_minutes,
--           title_type, average_rating, num_votes, genres (agg)
-- Design:   Requires ≥25,000 votes to prevent obscure titles
--           with few votes from appearing at the top.
--           Excludes tvEpisode (episodes aren't standalone titles).
--           Uses correlated subquery for genre aggregation to avoid
--           GROUP BY on all title columns.
-- Perf:     Uses idx_rating_avg, idx_rating_votes, idx_title_type.
-- ────────────────────────────────────────────────────────────

SELECT t.tconst, t.primary_title, t.start_year, t.runtime_minutes,
       t.title_type, r.average_rating, r.num_votes,
       COALESCE(
           (SELECT string_agg(g.name, ', ' ORDER BY g.name)
            FROM title_genre tg JOIN genre g USING(genre_id)
            WHERE tg.tconst = t.tconst), ''
       ) AS genres
FROM title t
JOIN rating r ON r.tconst = t.tconst
WHERE t.title_type NOT IN ('tvEpisode', 'videoGame')
  AND r.num_votes >= 25000
  AND ($1 OR t.is_adult = false)
ORDER BY r.average_rating DESC, r.num_votes DESC
LIMIT 50;


-- ────────────────────────────────────────────────────────────
-- Query 2: Home — Most Voted Titles
-- ────────────────────────────────────────────────────────────
-- Purpose:  Return the 50 most popular titles by vote count.
-- Inputs:   $1 = includeAdult (boolean)
-- Output:   same as Query 1
-- Design:   Pure popularity metric. Useful to show trending and
--           widely-known titles regardless of rating.
-- Perf:     Sorted by idx_rating_votes DESC.
-- ────────────────────────────────────────────────────────────

SELECT t.tconst, t.primary_title, t.start_year, t.runtime_minutes,
       t.title_type, r.average_rating, r.num_votes,
       COALESCE(
           (SELECT string_agg(g.name, ', ' ORDER BY g.name)
            FROM title_genre tg JOIN genre g USING(genre_id)
            WHERE tg.tconst = t.tconst), ''
       ) AS genres
FROM title t
JOIN rating r ON r.tconst = t.tconst
WHERE t.title_type NOT IN ('tvEpisode', 'videoGame')
  AND ($1 OR t.is_adult = false)
ORDER BY r.num_votes DESC
LIMIT 50;


-- ────────────────────────────────────────────────────────────
-- Query 3: Title Summary — Basic Info + Rating
-- ────────────────────────────────────────────────────────────
-- Purpose:  Fetch a single title's metadata + rating.
-- Inputs:   $1 = tconst
-- Output:   tconst, primary_title, original_title, title_type,
--           start_year, end_year, runtime_minutes, is_adult,
--           average_rating, num_votes
-- Design:   PK lookup on title + LEFT JOIN rating (not all titles
--           are rated). O(1) via PK index.
-- ────────────────────────────────────────────────────────────

SELECT t.tconst, t.primary_title, t.original_title, t.title_type,
       t.start_year, t.end_year, t.runtime_minutes, t.is_adult,
       r.average_rating, r.num_votes
FROM title t
LEFT JOIN rating r ON r.tconst = t.tconst
WHERE t.tconst = $1;


-- ────────────────────────────────────────────────────────────
-- Query 4: Title Summary — Directors & Writers
-- ────────────────────────────────────────────────────────────
-- Purpose:  Fetch directors and writers for a title.
-- Inputs:   $1 = tconst
-- Output:   nconst, primary_name, category
-- Design:   Filters principal by category IN ('director','writer').
--           Ordered by billing (ordering) to show lead director first.
-- Perf:     Uses idx_principal_tconst + idx_principal_category.
-- ────────────────────────────────────────────────────────────

SELECT p.nconst, p.primary_name, pr.category
FROM principal pr
JOIN person p ON p.nconst = pr.nconst
WHERE pr.tconst = $1 AND pr.category IN ('director', 'writer')
ORDER BY pr.ordering;


-- ────────────────────────────────────────────────────────────
-- Query 5: Title Summary — Top 5 Cast
-- ────────────────────────────────────────────────────────────
-- Purpose:  Show top-billed actors/actresses for the title summary.
-- Inputs:   $1 = tconst
-- Output:   nconst, primary_name, characters, ordering
-- Design:   Only actor/actress categories, LIMIT 5, sorted by
--           billing order. Keeps the summary page lightweight.
-- ────────────────────────────────────────────────────────────

SELECT p.nconst, p.primary_name, pr.characters, pr.ordering
FROM principal pr
JOIN person p ON p.nconst = pr.nconst
WHERE pr.tconst = $1 AND pr.category IN ('actor', 'actress')
ORDER BY pr.ordering
LIMIT 5;


-- ────────────────────────────────────────────────────────────
-- Query 6: Full Cast & Crew
-- ────────────────────────────────────────────────────────────
-- Purpose:  All principals for a title, grouped by role with
--           priority ordering (directors → writers → actors → rest).
-- Inputs:   $1 = tconst
-- Output:   category, nconst, primary_name, job, characters, ordering
-- Design:   CASE expression assigns priority to each category.
--           Frontend groups into sections. No LIMIT — full list.
-- ────────────────────────────────────────────────────────────

SELECT pr.category, p.nconst, p.primary_name, pr.job, pr.characters, pr.ordering
FROM principal pr
JOIN person p ON p.nconst = pr.nconst
WHERE pr.tconst = $1
ORDER BY
    CASE pr.category
        WHEN 'director' THEN 1
        WHEN 'writer' THEN 2
        WHEN 'actor' THEN 3
        WHEN 'actress' THEN 4
        WHEN 'producer' THEN 5
        WHEN 'composer' THEN 6
        WHEN 'cinematographer' THEN 7
        WHEN 'editor' THEN 8
        ELSE 9
    END,
    pr.ordering;


-- ────────────────────────────────────────────────────────────
-- Query 7: Series — Distinct Seasons
-- ────────────────────────────────────────────────────────────
-- Purpose:  List available seasons for a TV series.
-- Inputs:   $1 = parent tconst
-- Output:   season_number (distinct, sorted)
-- Design:   Simple DISTINCT on episode table.
--           Uses idx_episode_parent.
-- ────────────────────────────────────────────────────────────

SELECT DISTINCT e.season_number
FROM episode e
WHERE e.parent_tconst = $1 AND e.season_number IS NOT NULL
ORDER BY e.season_number;


-- ────────────────────────────────────────────────────────────
-- Query 8: Series — Episodes for a Season
-- ────────────────────────────────────────────────────────────
-- Purpose:  List episodes in a specific season with metadata + rating.
-- Inputs:   $1 = parent tconst, $2 = season_number
-- Output:   tconst, primary_title, season_number, episode_number,
--           start_year, runtime_minutes, average_rating, num_votes
-- Design:   Joins episode → title → rating.
--           LEFT JOIN rating because some episodes lack ratings.
--           Sorted by episode number for natural viewing order.
-- ────────────────────────────────────────────────────────────

SELECT e.tconst, t.primary_title, e.season_number, e.episode_number,
       t.start_year, t.runtime_minutes,
       r.average_rating, r.num_votes
FROM episode e
JOIN title t ON t.tconst = e.tconst
LEFT JOIN rating r ON r.tconst = e.tconst
WHERE e.parent_tconst = $1 AND e.season_number = $2
ORDER BY e.episode_number;


-- ────────────────────────────────────────────────────────────
-- Query 9: Person — Basic Info
-- ────────────────────────────────────────────────────────────
-- Purpose:  Fetch a person's basic details.
-- Inputs:   $1 = nconst
-- Output:   nconst, primary_name, birth_year, death_year
-- Design:   PK lookup. O(1).
-- ────────────────────────────────────────────────────────────

SELECT nconst, primary_name, birth_year, death_year
FROM person WHERE nconst = $1;


-- ────────────────────────────────────────────────────────────
-- Query 10: Person — Filmography
-- ────────────────────────────────────────────────────────────
-- Purpose:  List all titles a person worked on, grouped by role.
-- Inputs:   $1 = nconst
-- Output:   category, tconst, primary_title, title_type, start_year,
--           average_rating, num_votes, characters, job
-- Design:   Joins principal (by nconst) → title → rating.
--           Ordered by role priority then year descending.
--           Frontend groups by category and 50 items per group.
-- Perf:     Uses idx_principal_nconst.
-- ────────────────────────────────────────────────────────────

SELECT pr.category, t.tconst, t.primary_title, t.title_type, t.start_year,
       r.average_rating, r.num_votes, pr.characters, pr.job
FROM principal pr
JOIN title t ON t.tconst = pr.tconst
LEFT JOIN rating r ON r.tconst = t.tconst
WHERE pr.nconst = $1
ORDER BY
    CASE pr.category
        WHEN 'director' THEN 1
        WHEN 'writer' THEN 2
        WHEN 'actor' THEN 3
        WHEN 'actress' THEN 4
        WHEN 'producer' THEN 5
        ELSE 6
    END,
    t.start_year DESC NULLS LAST;


-- ────────────────────────────────────────────────────────────
-- Query 11: Search — Titles
-- ────────────────────────────────────────────────────────────
-- Purpose:  Search titles by name with type and adult filters.
-- Inputs:   $1 = search pattern (%query%), $2 = prefix pattern (query%),
--           $3..N = title_type values, $N+1 = LIMIT, $N+2 = OFFSET
-- Output:   tconst, primary_title, title_type, start_year,
--           runtime_minutes, average_rating, num_votes
-- Design:   ILIKE for case-insensitive matching. Prefix matches
--           ranked first via CASE expression. Sorted by popularity
--           (num_votes DESC) as tiebreaker.
--           Excludes tvEpisode from results.
-- Perf:     With pg_trgm GIN index, ILIKE becomes fast.
--           Without it, sequential scan but LIMIT keeps it bounded.
-- ────────────────────────────────────────────────────────────

SELECT t.tconst, t.primary_title, t.title_type, t.start_year,
       t.runtime_minutes, r.average_rating, r.num_votes,
       'title' AS result_type
FROM title t
LEFT JOIN rating r ON r.tconst = t.tconst
WHERE t.primary_title ILIKE $1
  AND t.title_type != 'tvEpisode'
  AND t.is_adult = false
ORDER BY
    CASE WHEN t.primary_title ILIKE $2 THEN 0 ELSE 1 END,
    r.num_votes DESC NULLS LAST
LIMIT $3 OFFSET $4;


-- ────────────────────────────────────────────────────────────
-- Query 12: Search — People
-- ────────────────────────────────────────────────────────────
-- Purpose:  Search people by name.
-- Inputs:   $1 = search pattern (%query%), $2 = prefix (query%),
--           $3 = LIMIT, $4 = OFFSET
-- Output:   nconst, primary_name, birth_year, death_year
-- Design:   Same ranking logic as title search.
-- ────────────────────────────────────────────────────────────

SELECT p.nconst, p.primary_name, p.birth_year, p.death_year,
       'person' AS result_type
FROM person p
WHERE p.primary_name ILIKE $1
ORDER BY
    CASE WHEN p.primary_name ILIKE $2 THEN 0 ELSE 1 END,
    p.primary_name
LIMIT $3 OFFSET $4;