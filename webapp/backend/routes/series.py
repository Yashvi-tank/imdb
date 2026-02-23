"""
Series / Episode Routes
========================
GET /api/series/:tconst/seasons            — List of distinct season numbers
GET /api/series/:tconst/episodes?season=N  — Episodes for a season with metadata + ratings

Query design:
  - Seasons: simple DISTINCT on episode.season_number for a parent.
  - Episodes: join episode → title → rating, filtered by parent + season, sorted by ep number.

Response shapes:
  Seasons: { tconst, primary_title, seasons: [1, 2, 3, ...] }
  
  Episodes: { tconst, primary_title, season, episodes: [
    { tconst, primary_title, episode_number, start_year, runtime_minutes,
      average_rating, num_votes }
  ]}
"""

from flask import Blueprint, jsonify, request
from ..db import query

series_bp = Blueprint("series", __name__)


@series_bp.route("/api/series/<tconst>/seasons")
def seasons(tconst):
    info = query("SELECT tconst, primary_title, title_type FROM title WHERE tconst = %s",
                 (tconst,), one=True)
    if not info:
        return jsonify({"error": "Title not found"}), 404

    rows = query("""
        SELECT DISTINCT e.season_number
        FROM episode e
        WHERE e.parent_tconst = %s AND e.season_number IS NOT NULL
        ORDER BY e.season_number
    """, (tconst,))

    return jsonify({
        "tconst": info["tconst"],
        "primary_title": info["primary_title"],
        "seasons": [r["season_number"] for r in rows],
    })


@series_bp.route("/api/series/<tconst>/episodes")
def episodes(tconst):
    season = request.args.get("season", type=int)

    info = query("SELECT tconst, primary_title FROM title WHERE tconst = %s",
                 (tconst,), one=True)
    if not info:
        return jsonify({"error": "Title not found"}), 404

    season_filter = "AND e.season_number = %s" if season else ""
    params = (tconst, season) if season else (tconst,)

    rows = query(f"""
        SELECT e.tconst, t.primary_title, e.season_number, e.episode_number,
               t.start_year, t.runtime_minutes,
               r.average_rating, r.num_votes
        FROM episode e
        JOIN title t ON t.tconst = e.tconst
        LEFT JOIN rating r ON r.tconst = e.tconst
        WHERE e.parent_tconst = %s {season_filter}
        ORDER BY e.season_number, e.episode_number
    """, params)

    return jsonify({
        "tconst": info["tconst"],
        "primary_title": info["primary_title"],
        "season": season,
        "episodes": rows,
    })
