# IMDb Clone — Schema Documentation

## Entity-Relationship Overview

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  person   │────▶│ principal │◀────│  title   │
│  (nconst) │     │ (tconst, │     │ (tconst) │
│           │     │  ordering)│     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                    ┌──────────────────┼──────────────┐
                    │                  │              │
               ┌────▼────┐      ┌─────▼────┐   ┌────▼────┐
               │ episode  │      │title_genre│   │ rating  │
               │(parent_  │      │          │   │         │
               │ tconst)  │      └────┬─────┘   └─────────┘
               └──────────┘           │
                                ┌─────▼────┐
                                │  genre   │
                                └──────────┘
```

## Tables

### `title`
Core table for all IMDb title types.

| Column | Type | Description |
|--------|------|-------------|
| `tconst` (PK) | VARCHAR(12) | IMDb title ID (e.g., `tt0111161`) |
| `title_type` | VARCHAR(20) | movie, tvSeries, tvEpisode, short, etc. |
| `primary_title` | TEXT | Display title |
| `original_title` | TEXT | Original language title |
| `is_adult` | BOOLEAN | Adult content flag |
| `start_year` | SMALLINT | Release/start year (nullable) |
| `end_year` | SMALLINT | End year for series (nullable) |
| `runtime_minutes` | INTEGER | Duration in minutes (nullable) |

### `person`
All people (actors, directors, writers, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `nconst` (PK) | VARCHAR(12) | IMDb person ID (e.g., `nm0000001`) |
| `primary_name` | TEXT | Display name |
| `birth_year` | SMALLINT | Birth year (nullable) |
| `death_year` | SMALLINT | Death year (nullable) |

### `episode`
Links tvEpisode titles to their parent tvSeries.

| Column | Type | Description |
|--------|------|-------------|
| `tconst` (PK, FK→title) | VARCHAR(12) | Episode's tconst |
| `parent_tconst` (FK→title) | VARCHAR(12) | Parent series tconst |
| `season_number` | SMALLINT | Season number (nullable) |
| `episode_number` | SMALLINT | Episode number within season (nullable) |

### `principal`
Cast & crew assignments (from title.principals.tsv).

| Column | Type | Description |
|--------|------|-------------|
| `tconst` (PK, FK→title) | VARCHAR(12) | Title ID |
| `ordering` (PK) | SMALLINT | Billing order |
| `nconst` (FK→person) | VARCHAR(12) | Person ID |
| `category` | VARCHAR(30) | Role type: actor, director, writer, etc. |
| `job` | TEXT | Specific job description (nullable) |
| `characters` | TEXT | JSON array of character names (nullable) |

### `genre`
Lookup table for genre names.

| Column | Type | Description |
|--------|------|-------------|
| `genre_id` (PK) | SERIAL | Auto-increment ID |
| `name` | VARCHAR(50) | Genre name (unique) |

### `title_genre`
Many-to-many join between titles and genres.

| Column | Type | Description |
|--------|------|-------------|
| `tconst` (PK, FK→title) | VARCHAR(12) | Title ID |
| `genre_id` (PK, FK→genre) | INTEGER | Genre ID |

### `rating`
One rating row per title (from title.ratings.tsv).

| Column | Type | Description |
|--------|------|-------------|
| `tconst` (PK, FK→title) | VARCHAR(12) | Title ID |
| `average_rating` | NUMERIC(3,1) | Weighted average (0.0–10.0) |
| `num_votes` | INTEGER | Total number of votes |

## Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `idx_title_type` | title | title_type | Filter by movie/series/episode |
| `idx_title_start_year` | title | start_year | Year-range queries |
| `idx_title_is_adult` | title | is_adult | Adult filtering |
| `idx_title_primary` | title | primary_title | Text search |
| `idx_person_name` | person | primary_name | Name search |
| `idx_principal_tconst` | principal | tconst | Find cast for a title |
| `idx_principal_nconst` | principal | nconst | Find filmography for a person |
| `idx_principal_category` | principal | category | Filter by role type |
| `idx_episode_parent` | episode | parent_tconst | Find episodes for a series |
| `idx_rating_votes` | rating | num_votes DESC | Sort by popularity |
| `idx_rating_avg` | rating | average_rating DESC | Sort by rating |
| `idx_title_genre_genre` | title_genre | genre_id | Genre-based filtering |

## Data Source

All data comes from [IMDb Non-Commercial Datasets](https://datasets.imdbws.com/):
- `title.basics.tsv` → `title` + `genre` + `title_genre`
- `name.basics.tsv` → `person`
- `title.ratings.tsv` → `rating`
- `title.principals.tsv` → `principal`
- `title.episode.tsv` → `episode` (if available)
