"""
Discover — TMDB-powered filter/browse endpoint.
GET /api/discover?genre=28&year=2024&rating=7&type=movie&sort=popularity.desc&page=1
"""
from flask import Blueprint, jsonify, request
from ..services import tmdb

discover_bp = Blueprint("discover", __name__)

SORT_MAP = {
    "popularity": "popularity.desc",
    "rating": "vote_average.desc",
    "release_date": "primary_release_date.desc",
    "votes": "vote_count.desc",
}


@discover_bp.route("/api/discover")
def discover():
    if not tmdb.is_available():
        return jsonify({"error": "TMDB API key not configured. Set TMDB_API_KEY in .env"}), 503

    media_type = request.args.get("type", "movie")
    if media_type not in ("movie", "tv"):
        media_type = "movie"
    genre = request.args.get("genre", "")
    year = request.args.get("year", "", type=str) or None
    min_rating = request.args.get("rating", "", type=str) or None
    sort_raw = request.args.get("sort", "popularity")
    sort_by = SORT_MAP.get(sort_raw, "popularity.desc")
    page = max(1, request.args.get("page", 1, type=int))
    include_adult = request.args.get("includeAdult", "false").lower() == "true"

    data = tmdb.discover(
        media_type=media_type, genre=genre or None, year=year,
        min_rating=min_rating, sort_by=sort_by, page=page,
        include_adult=include_adult
    )

    results = [tmdb.normalize_title(m, media_type) for m in data.get("results", [])]

    return jsonify({
        "page": data.get("page", page),
        "totalPages": min(data.get("total_pages", 1), 500),
        "totalResults": data.get("total_results", 0),
        "results": results,
    })
