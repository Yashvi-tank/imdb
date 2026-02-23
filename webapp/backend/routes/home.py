"""
Home Routes
============
GET /api/home — Returns Top Rated + Most Voted lists for the homepage.

Both lists are cached for 5 minutes to avoid expensive sorts on every request.

Query design:
  - Top Rated: titles with ≥25,000 votes, sorted by average_rating DESC.
    The vote threshold prevents obscure titles with few votes from dominating.
  - Most Voted: sorted by num_votes DESC (pure popularity).
  - Both exclude tvEpisode type (episodes are not standalone titles).
  - Adult filtering applied via includeAdult parameter (default: exclude).

Response shape:
{
  "topRated": [{ tconst, primary_title, start_year, runtime_minutes, title_type,
                 average_rating, num_votes, genres }],
  "mostVoted": [same shape]
}
"""

import time
from flask import Blueprint, jsonify, request
from ..db import query

home_bp = Blueprint("home", __name__)

# Simple in-memory cache
_cache = {}
CACHE_TTL = 300  # 5 minutes


def _cached(key, fn):
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < CACHE_TTL:
        return _cache[key]["data"]
    data = fn()
    _cache[key] = {"data": data, "ts": now}
    return data


@home_bp.route("/api/home")
def home():
    include_adult = request.args.get("includeAdult", "false").lower() == "true"
    adult_filter = "" if include_adult else "AND t.is_adult = false"
    cache_key = f"home_{include_adult}"

    def fetch():
        top_rated = query(f"""
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
              {adult_filter}
            ORDER BY r.average_rating DESC, r.num_votes DESC
            LIMIT 50
        """)

        most_voted = query(f"""
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
              {adult_filter}
            ORDER BY r.num_votes DESC
            LIMIT 50
        """)

        return {"topRated": top_rated, "mostVoted": most_voted}

    data = _cached(cache_key, fetch)
    return jsonify(data)
