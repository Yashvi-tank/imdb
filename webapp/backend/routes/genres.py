"""
Genres — TMDB genre list with local DB fallback.
GET /api/genres?type=movie|tv
"""
from flask import Blueprint, jsonify, request
from ..db import query
from ..services import tmdb

genres_bp = Blueprint("genres", __name__)
_cache = {}


@genres_bp.route("/api/genres")
def list_genres():
    media_type = request.args.get("type", "movie")
    cache_key = f"genres_{media_type}_{tmdb.is_available()}"

    if cache_key not in _cache:
        if tmdb.is_available():
            _cache[cache_key] = tmdb.get_genres(media_type)
        else:
            rows = query("SELECT genre_id AS id, name FROM genre ORDER BY name")
            _cache[cache_key] = rows

    return jsonify({"genres": _cache[cache_key]})
