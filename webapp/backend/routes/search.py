"""
Search — TMDB /search/multi with local DB fallback.
GET /api/search?q=...&page=1
"""
from flask import Blueprint, jsonify, request
from ..db import query as db_query
from ..services import tmdb

search_bp = Blueprint("search", __name__)
PAGE_SIZE = 20


@search_bp.route("/api/search")
def search():
    q = request.args.get("q", "").strip()
    page = max(1, request.args.get("page", 1, type=int))
    if not q or len(q) < 2:
        return jsonify({"error": "Query must be at least 2 characters"}), 400

    if tmdb.is_available():
        data = tmdb.search_multi(q, page)
        results = []
        for item in data.get("results", []):
            mt = item.get("media_type")
            if mt in ("movie", "tv"):
                results.append(tmdb.normalize_title(item, mt))
            elif mt == "person":
                results.append(tmdb.normalize_person(item))
        return jsonify({
            "query": q, "page": page, "results": results,
            "totalPages": data.get("total_pages", 1),
            "totalResults": data.get("total_results", 0),
            "source": "tmdb",
        })

    # Local DB fallback
    search_type = request.args.get("type", "all").lower()
    include_adult = request.args.get("includeAdult", "false").lower() == "true"
    offset = (page - 1) * PAGE_SIZE
    pattern = f"%{q}%"

    if search_type == "person":
        results = db_query("""
            SELECT p.nconst AS id, p.primary_name AS name,
                   p.birth_year, p.death_year, 'person' AS media_type
            FROM person p WHERE p.primary_name ILIKE %s
            ORDER BY p.primary_name LIMIT %s OFFSET %s
        """, (pattern, PAGE_SIZE + 1, offset))
    else:
        adult_f = "" if include_adult else "AND t.is_adult = false"
        results = db_query(f"""
            SELECT t.tconst AS id, t.primary_title AS title,
                   t.title_type AS media_type, t.start_year AS year,
                   t.runtime_minutes AS runtime, t.poster_url AS poster,
                   r.average_rating AS rating, r.num_votes AS votes
            FROM title t LEFT JOIN rating r ON r.tconst=t.tconst
            WHERE t.primary_title ILIKE %s AND t.title_type!='tvEpisode'
              {adult_f}
            ORDER BY r.num_votes DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, (pattern, PAGE_SIZE + 1, offset))

    has_more = len(results) > PAGE_SIZE
    if has_more:
        results = results[:PAGE_SIZE]
    return jsonify({
        "query": q, "page": page, "results": results,
        "totalPages": page + (1 if has_more else 0),
        "totalResults": len(results),
        "source": "local",
    })
