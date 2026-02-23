"""
Search Route
=============
GET /api/search?q=...&type=movie|series|person&includeAdult=false&page=1

Query design:
  - Uses ILIKE with prefix + contains strategy for broad matching.
  - For titles: filters by title_type when type is specified, excludes adult by default.
  - For people: searches primary_name.
  - Pagination: 20 results per page.
  - Results include basic info + rating where available.

Response shape:
{
  "query": "matrix",
  "type": "movie",
  "page": 1,
  "results": [{ tconst|nconst, primary_title|primary_name, ... }],
  "hasMore": true|false
}
"""

from flask import Blueprint, jsonify, request
from ..db import query as db_query

search_bp = Blueprint("search", __name__)

PAGE_SIZE = 20

# Map user-friendly type names to title_type values
TYPE_MAP = {
    "movie": ("movie", "tvMovie"),
    "series": ("tvSeries", "tvMiniSeries"),
    "short": ("short", "tvShort"),
    "all": None,
}


@search_bp.route("/api/search")
def search():
    q = request.args.get("q", "").strip()
    search_type = request.args.get("type", "all").lower()
    include_adult = request.args.get("includeAdult", "false").lower() == "true"
    page = max(1, request.args.get("page", 1, type=int))
    offset = (page - 1) * PAGE_SIZE

    if not q or len(q) < 2:
        return jsonify({"error": "Query must be at least 2 characters"}), 400

    pattern = f"%{q}%"

    if search_type == "person":
        results = db_query("""
            SELECT p.nconst, p.primary_name, p.birth_year, p.death_year,
                   'person' AS result_type
            FROM person p
            WHERE p.primary_name ILIKE %s
            ORDER BY
                CASE WHEN p.primary_name ILIKE %s THEN 0 ELSE 1 END,
                p.primary_name
            LIMIT %s OFFSET %s
        """, (pattern, q + '%', PAGE_SIZE + 1, offset))
    else:
        # Title search
        type_filter = ""
        params = [pattern, q + '%']

        if search_type in TYPE_MAP and TYPE_MAP[search_type]:
            types = TYPE_MAP[search_type]
            placeholders = ",".join(["%s"] * len(types))
            type_filter = f"AND t.title_type IN ({placeholders})"
            params.extend(types)

        adult_filter = "" if include_adult else "AND t.is_adult = false"

        params.extend([PAGE_SIZE + 1, offset])

        results = db_query(f"""
            SELECT t.tconst, t.primary_title, t.title_type, t.start_year,
                   t.runtime_minutes, r.average_rating, r.num_votes,
                   'title' AS result_type
            FROM title t
            LEFT JOIN rating r ON r.tconst = t.tconst
            WHERE t.primary_title ILIKE %s
              {type_filter}
              {adult_filter}
              AND t.title_type != 'tvEpisode'
            ORDER BY
                CASE WHEN t.primary_title ILIKE %s THEN 0 ELSE 1 END,
                r.num_votes DESC NULLS LAST
            LIMIT %s OFFSET %s
        """, params)

    has_more = len(results) > PAGE_SIZE
    if has_more:
        results = results[:PAGE_SIZE]

    return jsonify({
        "query": q,
        "type": search_type,
        "page": page,
        "results": results,
        "hasMore": has_more,
    })
