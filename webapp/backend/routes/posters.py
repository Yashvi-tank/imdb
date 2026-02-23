"""
Poster Routes
==============
GET /api/poster/:tconst — Returns poster URL for a title.

Strategy:
  1. Check if poster_url is already cached in DB → return it
  2. If TMDB_API_KEY is set, fetch from TMDB API → cache in DB → return
  3. Fallback: return a generated placeholder SVG URL

TMDB search matches by IMDb ID (find/tt...) for exact results.
Poster URLs are cached permanently in the title.poster_url column.
"""

import os
import threading
from flask import Blueprint, jsonify
from ..db import query, get_conn, put_conn

poster_bp = Blueprint("posters", __name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG = "https://image.tmdb.org/t/p/w500"

# Placeholder poster SVG (data URI) — dark gradient with film icon
PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%231a1a2e'/%3E%3Cstop offset='1' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='450' fill='url(%23g)'/%3E%3Ctext x='150' y='200' text-anchor='middle' font-size='64' fill='%23333'%3E%F0%9F%8E%AC%3C/text%3E%3Ctext x='150' y='260' text-anchor='middle' font-size='16' fill='%23555' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E"


def _fetch_tmdb_poster(tconst):
    """Fetch poster from TMDB by IMDb ID. Returns URL string or None."""
    if not TMDB_API_KEY:
        return None
    try:
        import urllib.request
        import json
        url = f"{TMDB_BASE}/find/{tconst}?api_key={TMDB_API_KEY}&external_source=imdb_id"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        # Check movie_results and tv_results
        for key in ("movie_results", "tv_results", "tv_episode_results"):
            results = data.get(key, [])
            if results and results[0].get("poster_path"):
                return TMDB_IMG + results[0]["poster_path"]
    except Exception:
        pass
    return None


def _cache_poster(tconst, poster_url):
    """Store poster URL in DB (fire-and-forget background)."""
    def do_cache():
        conn = get_conn()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE title SET poster_url = %s WHERE tconst = %s",
                        (poster_url, tconst))
            conn.commit()
            cur.close()
        except Exception:
            conn.rollback()
        finally:
            put_conn(conn)
    threading.Thread(target=do_cache, daemon=True).start()


@poster_bp.route("/api/poster/<tconst>")
def get_poster(tconst):
    # 1. Check DB cache
    row = query("SELECT poster_url FROM title WHERE tconst = %s", (tconst,), one=True)
    if not row:
        return jsonify({"error": "Title not found"}), 404

    if row["poster_url"]:
        return jsonify({"tconst": tconst, "poster_url": row["poster_url"]})

    # 2. Try TMDB
    poster_url = _fetch_tmdb_poster(tconst)
    if poster_url:
        _cache_poster(tconst, poster_url)
        return jsonify({"tconst": tconst, "poster_url": poster_url})

    # 3. Fallback placeholder
    return jsonify({"tconst": tconst, "poster_url": PLACEHOLDER})
