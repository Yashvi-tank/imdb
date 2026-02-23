# IMDb Clone — Query Documentation

## Web Queries (`queries/web_queries.sql`)

### Query 1 & 2: Home Page (Top Rated / Most Voted)
- **Endpoint**: `GET /api/home`
- **Purpose**: Populate homepage with two ranked lists
- **Top Rated**: Titles with ≥25,000 votes, sorted by `average_rating DESC`
  - The vote threshold prevents obscure titles with very few votes from dominating
- **Most Voted**: Sorted by `num_votes DESC` — pure popularity metric
- **Filters**: Excludes `tvEpisode` and `videoGame`. Adult filter via parameter.
- **Genre aggregation**: Uses correlated subquery with `string_agg()` to avoid GROUP BY on all title columns
- **Performance**: Cached 5 minutes in-memory; uses `idx_rating_avg` and `idx_rating_votes`

### Query 3: Title Summary
- **Endpoint**: `GET /api/title/:tconst`
- **Purpose**: Single title's metadata + rating
- **Design**: PK lookup (O(1)) + LEFT JOIN rating (not all titles rated)

### Query 4 & 5: Directors/Writers and Top Cast
- **Endpoint**: Part of `GET /api/title/:tconst`
- **Purpose**: Show key creators and top 5 actors
- **Design**: Filter `principal` by category, LIMIT 5 for cast, ordered by billing

### Query 6: Full Cast & Crew
- **Endpoint**: `GET /api/title/:tconst/full-credits`
- **Purpose**: Complete cast/crew list grouped by role
- **Design**: CASE expression assigns category priority (director → writer → actor → rest)

### Query 7 & 8: Series Seasons/Episodes
- **Endpoint**: `GET /api/series/:tconst/seasons` and `/episodes?season=`
- **Purpose**: Browse TV series by season
- **Design**: DISTINCT season numbers, then episode list sorted by `episode_number`

### Query 9 & 10: Person Info & Filmography
- **Endpoint**: `GET /api/person/:nconst`
- **Purpose**: Person details + all titles grouped by role
- **Design**: PK lookup for info, then `principal` JOIN `title` JOIN `rating` sorted by role priority + year DESC

### Query 11 & 12: Search
- **Endpoint**: `GET /api/search?q=...&type=...&page=...`
- **Purpose**: Find titles or people by name
- **Design**: ILIKE with prefix-match priority ranking. Paginated (20/page).
- **Titles**: Sorted by prefix match → popularity; excludes episodes
- **People**: Sorted by prefix match → alphabetical

---

## Analysis Queries (`queries/analysis_queries.sql`)

### Analysis 1: Ratings Trend by Decade
- **Chart**: Dual-axis (bar = title count, line = avg rating)
- **Design**: Groups by `(start_year/10)*10`, filters years ≥ 1890, only movies/series

### Analysis 2: Top Directors by Avg Rating
- **Chart**: Horizontal bar chart
- **Design**: `HAVING COUNT(*) >= 5` ensures statistical significance

### Analysis 3: Genre Popularity Over Time
- **Chart**: Multi-line chart (one per genre)
- **Design**: Limited to genres with ≥1,000 titles, decades 1950+

### Analysis 4: Most Prolific Actors
- **Chart**: Horizontal bar chart
- **Design**: Counts distinct titles per actor, minimum 20 roles
