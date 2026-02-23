"""
Genres Route
=============
GET /api/genres — Returns all genre names (for filter dropdown).
Cached permanently (genres don't change).
"""

from flask import Blueprint, jsonify
from ..db import query

genres_bp = Blueprint("genres", __name__)

_genres_cache = None


@genres_bp.route("/api/genres")
def list_genres():
    global _genres_cache
    if _genres_cache is None:
        rows = query("SELECT name FROM genre ORDER BY name")
        _genres_cache = [r["name"] for r in rows]
    return jsonify({"genres": _genres_cache})
