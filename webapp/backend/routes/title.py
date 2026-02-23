"""
Title Routes
=============
GET /api/title/:tconst        — Title summary page (info + rating + directors/writers + top cast)
GET /api/title/:tconst/full-credits — Full cast & crew grouped by category

Query design:
  - Summary: single lookup by tconst PK → O(1). LEFT JOIN rating (not all titles rated).
    Directors/writers and top-5 cast fetched as sub-queries for clean JSON structure.
  - Full credits: JOIN principal + person, ordered by category priority then billing order.
    Grouping done in Python to build nested JSON (director[], writer[], actor[], etc.).

Response shapes:
  Summary: { tconst, primary_title, original_title, title_type, start_year, end_year,
             runtime_minutes, is_adult, average_rating, num_votes, genres,
             directors: [{nconst, primary_name}], writers: [...], cast: [...top 5] }

  Full credits: { tconst, primary_title, credits: { "director": [...], "actor": [...], ... } }
"""

from flask import Blueprint, jsonify
from ..db import query
from collections import OrderedDict

title_bp = Blueprint("title", __name__)


@title_bp.route("/api/title/<tconst>")
def title_summary(tconst):
    # Main title info + rating
    info = query("""
        SELECT t.tconst, t.primary_title, t.original_title, t.title_type,
               t.start_year, t.end_year, t.runtime_minutes, t.is_adult,
               r.average_rating, r.num_votes
        FROM title t
        LEFT JOIN rating r ON r.tconst = t.tconst
        WHERE t.tconst = %s
    """, (tconst,), one=True)

    if not info:
        return jsonify({"error": "Title not found"}), 404

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

    # Top 5 cast (actors/actresses)
    cast = query("""
        SELECT p.nconst, p.primary_name, pr.characters, pr.ordering
        FROM principal pr
        JOIN person p ON p.nconst = pr.nconst
        WHERE pr.tconst = %s AND pr.category IN ('actor', 'actress')
        ORDER BY pr.ordering
        LIMIT 5
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
