"""
Title Routes
=============
GET /api/title/:tconst        — Title summary (info + rating + genres + directors/writers + top 15 cast + poster)
GET /api/title/:tconst/full-credits — Full cast & crew grouped by category
"""

from flask import Blueprint, jsonify
from ..db import query
from collections import OrderedDict

title_bp = Blueprint("title", __name__)

PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%231a1a2e'/%3E%3Cstop offset='1' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='450' fill='url(%23g)'/%3E%3Ctext x='150' y='200' text-anchor='middle' font-size='64' fill='%23333'%3E%F0%9F%8E%AC%3C/text%3E%3Ctext x='150' y='260' text-anchor='middle' font-size='16' fill='%23555' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E"


@title_bp.route("/api/title/<tconst>")
def title_summary(tconst):
    # Main title info + rating + poster
    info = query("""
        SELECT t.tconst, t.primary_title, t.original_title, t.title_type,
               t.start_year, t.end_year, t.runtime_minutes, t.is_adult,
               t.poster_url, r.average_rating, r.num_votes
        FROM title t
        LEFT JOIN rating r ON r.tconst = t.tconst
        WHERE t.tconst = %s
    """, (tconst,), one=True)

    if not info:
        return jsonify({"error": "Title not found"}), 404

    # Ensure poster_url has a value
    if not info.get("poster_url"):
        info["poster_url"] = PLACEHOLDER_POSTER

    # Genres
    genres = query("""
        SELECT g.name
        FROM title_genre tg
        JOIN genre g USING(genre_id)
        WHERE tg.tconst = %s
        ORDER BY g.name
    """, (tconst,))
    info["genres"] = [g["name"] for g in genres]

    # Directors & Writers
    crew = query("""
        SELECT p.nconst, p.primary_name, pr.category
        FROM principal pr
        JOIN person p ON p.nconst = pr.nconst
        WHERE pr.tconst = %s AND pr.category IN ('director', 'writer')
        ORDER BY pr.ordering
    """, (tconst,))
    info["directors"] = [c for c in crew if c["category"] == "director"]
    info["writers"] = [c for c in crew if c["category"] == "writer"]

    # Top 15 cast (actors/actresses)
    cast = query("""
        SELECT p.nconst, p.primary_name, pr.characters, pr.ordering
        FROM principal pr
        JOIN person p ON p.nconst = pr.nconst
        WHERE pr.tconst = %s AND pr.category IN ('actor', 'actress')
        ORDER BY pr.ordering
        LIMIT 15
    """, (tconst,))
    info["cast"] = cast

    return jsonify(info)


@title_bp.route("/api/title/<tconst>/full-credits")
def full_credits(tconst):
    # Verify title exists
    info = query("SELECT tconst, primary_title FROM title WHERE tconst = %s",
                 (tconst,), one=True)
    if not info:
        return jsonify({"error": "Title not found"}), 404

    # All principals ordered by category priority then billing
    rows = query("""
        SELECT pr.category, p.nconst, p.primary_name, pr.job, pr.characters, pr.ordering
        FROM principal pr
        JOIN person p ON p.nconst = pr.nconst
        WHERE pr.tconst = %s
        ORDER BY
            CASE pr.category
                WHEN 'director' THEN 1
                WHEN 'writer' THEN 2
                WHEN 'actor' THEN 3
                WHEN 'actress' THEN 4
                WHEN 'producer' THEN 5
                WHEN 'composer' THEN 6
                WHEN 'cinematographer' THEN 7
                WHEN 'editor' THEN 8
                ELSE 9
            END,
            pr.ordering
    """, (tconst,))

    # Group by category
    credits = OrderedDict()
    for row in rows:
        cat = row["category"]
        if cat not in credits:
            credits[cat] = []
        credits[cat].append({
            "nconst": row["nconst"],
            "primary_name": row["primary_name"],
            "job": row["job"],
            "characters": row["characters"],
            "ordering": row["ordering"],
        })

    return jsonify({
        "tconst": info["tconst"],
        "primary_title": info["primary_title"],
        "credits": credits,
    })
