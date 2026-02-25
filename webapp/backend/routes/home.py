"""
Home — TMDB trending + top rated, with local DB fallback.
"""
import time
from flask import Blueprint, jsonify, request
from ..db import query
from ..services import tmdb

home_bp = Blueprint("home", __name__)
_cache = {}
CACHE_TTL = 300


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
    use_tmdb = tmdb.is_available()
    cache_key = f"home_{include_adult}_{use_tmdb}"

    def fetch():
        if use_tmdb:
            tr = tmdb.get_trending("movie", "week")
            top = tmdb.get_top_rated("movie")
            return {
                "trending": [tmdb.normalize_title(m, "movie") for m in tr.get("results", [])[:20]],
                "topRated": [tmdb.normalize_title(m, "movie") for m in top.get("results", [])[:20]],
                "source": "tmdb",
            }
        adult_filter = "" if include_adult else "AND t.is_adult = false"
        top_rated = query(f"""
            SELECT t.tconst AS id, t.primary_title AS title, t.start_year AS year,
                   t.runtime_minutes AS runtime, t.title_type AS media_type,
                   t.poster_url AS poster, r.average_rating AS rating, r.num_votes AS votes,
                   COALESCE((SELECT string_agg(g.name,', ' ORDER BY g.name)
                     FROM title_genre tg JOIN genre g USING(genre_id)
                     WHERE tg.tconst=t.tconst),'') AS genres
            FROM title t JOIN rating r ON r.tconst=t.tconst
            WHERE t.title_type NOT IN ('tvEpisode','videoGame')
              AND r.num_votes>=25000 {adult_filter}
            ORDER BY r.average_rating DESC, r.num_votes DESC LIMIT 20
        """)
        most = query(f"""
            SELECT t.tconst AS id, t.primary_title AS title, t.start_year AS year,
                   t.runtime_minutes AS runtime, t.title_type AS media_type,
                   t.poster_url AS poster, r.average_rating AS rating, r.num_votes AS votes,
                   COALESCE((SELECT string_agg(g.name,', ' ORDER BY g.name)
                     FROM title_genre tg JOIN genre g USING(genre_id)
                     WHERE tg.tconst=t.tconst),'') AS genres
            FROM title t JOIN rating r ON r.tconst=t.tconst
            WHERE t.title_type NOT IN ('tvEpisode','videoGame') {adult_filter}
            ORDER BY r.num_votes DESC LIMIT 20
        """)
        return {"trending": most, "topRated": top_rated, "source": "local"}

    return jsonify(_cached(cache_key, fetch))
