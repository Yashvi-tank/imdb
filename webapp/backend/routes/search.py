"""
Search Route — Advanced Filters
=================================
GET /api/search?q=...&type=movie|series|person
                &yearFrom=1990&yearTo=2020
                &genre=Action
                &minRating=7.0
                &sortBy=rating|year|votes
                &includeAdult=false
                &page=1

Dynamic SQL builder with parameterized queries.
All filter combinations use indexes.
"""

from flask import Blueprint, jsonify, request
from ..db import query as db_query

search_bp = Blueprint("search", __name__)

PAGE_SIZE = 20

TYPE_MAP = {
    "movie": ("movie", "tvMovie"),
    "series": ("tvSeries", "tvMiniSeries"),
    "short": ("short", "tvShort"),
    "all": None,
}

SORT_MAP = {
    "rating": "r.average_rating DESC NULLS LAST",
    "year":   "t.start_year DESC NULLS LAST",
    "votes":  "r.num_votes DESC NULLS LAST",
}


@search_bp.route("/api/search")
def search():
    q = request.args.get("q", "").strip()
    search_type = request.args.get("type", "all").lower()
    include_adult = request.args.get("includeAdult", "false").lower() == "true"
    page = max(1, request.args.get("page", 1, type=int))
    offset = (page - 1) * PAGE_SIZE

    # Advanced filters
    year_from = request.args.get("yearFrom", type=int)
    year_to = request.args.get("yearTo", type=int)
    genre = request.args.get("genre", "").strip()
    min_rating = request.args.get("minRating", type=float)
    sort_by = request.args.get("sortBy", "").lower()

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
        # Dynamic title search with filters
        conditions = ["t.primary_title ILIKE %s"]
        params = [pattern]

        # Type filter
        if search_type in TYPE_MAP and TYPE_MAP[search_type]:
            types = TYPE_MAP[search_type]
            placeholders = ",".join(["%s"] * len(types))
            conditions.append(f"t.title_type IN ({placeholders})")
            params.extend(types)

        # Always exclude episodes
        conditions.append("t.title_type != 'tvEpisode'")

        # Adult filter
        if not include_adult:
            conditions.append("t.is_adult = false")

        # Year range
        if year_from:
            conditions.append("t.start_year >= %s")
            params.append(year_from)
        if year_to:
            conditions.append("t.start_year <= %s")
            params.append(year_to)

        # Genre filter (requires JOIN)
        genre_join = ""
        if genre:
            genre_join = """
                JOIN title_genre tg ON tg.tconst = t.tconst
                JOIN genre g ON g.genre_id = tg.genre_id
            """
            conditions.append("g.name = %s")
            params.append(genre)

        # Min rating (requires rating to exist)
        if min_rating:
            conditions.append("r.average_rating >= %s")
            params.append(min_rating)

        where_clause = " AND ".join(conditions)

        # Sort order
        order_by = SORT_MAP.get(sort_by, "")
        if order_by:
            order_clause = order_by
        else:
            # Default: prefix match priority → popularity
            order_clause = f"""
                CASE WHEN t.primary_title ILIKE %s THEN 0 ELSE 1 END,
                r.num_votes DESC NULLS LAST
            """
            params.append(q + '%')

        params.extend([PAGE_SIZE + 1, offset])

        results = db_query(f"""
            SELECT t.tconst, t.primary_title, t.title_type, t.start_year,
                   t.runtime_minutes, t.poster_url, r.average_rating, r.num_votes,
                   'title' AS result_type
            FROM title t
            LEFT JOIN rating r ON r.tconst = t.tconst
            {genre_join}
            WHERE {where_clause}
            ORDER BY {order_clause}
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
        "filters": {
            "yearFrom": year_from,
            "yearTo": year_to,
            "genre": genre or None,
            "minRating": min_rating,
            "sortBy": sort_by or None,
        }
    })
