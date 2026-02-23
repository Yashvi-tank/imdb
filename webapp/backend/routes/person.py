"""
Person Routes
==============
GET /api/person/:nconst — Person info + filmography grouped by role.

Query design:
  - Person info: direct PK lookup on person table.
  - Filmography: JOIN principal → title → rating, grouped by category.
    Sorted by start_year DESC within each role group.
    Paginated: returns first 50 per category.

Response shape:
{
  "nconst": "nm0000001",
  "primary_name": "Fred Astaire",
  "birth_year": 1899, "death_year": 1987,
  "filmography": {
    "actor": [{ tconst, primary_title, title_type, start_year, average_rating, characters }],
    "director": [...],
    ...
  }
}
"""

from flask import Blueprint, jsonify
from ..db import query
from collections import OrderedDict

person_bp = Blueprint("person", __name__)


@person_bp.route("/api/person/<nconst>")
def person_detail(nconst):
    info = query("""
        SELECT nconst, primary_name, birth_year, death_year
        FROM person WHERE nconst = %s
    """, (nconst,), one=True)

    if not info:
        return jsonify({"error": "Person not found"}), 404

    rows = query("""
        SELECT pr.category, t.tconst, t.primary_title, t.title_type, t.start_year,
               r.average_rating, r.num_votes, pr.characters, pr.job
        FROM principal pr
        JOIN title t ON t.tconst = pr.tconst
        LEFT JOIN rating r ON r.tconst = t.tconst
        WHERE pr.nconst = %s
        ORDER BY
            CASE pr.category
                WHEN 'director' THEN 1
                WHEN 'writer' THEN 2
                WHEN 'actor' THEN 3
                WHEN 'actress' THEN 4
                WHEN 'producer' THEN 5
                ELSE 6
            END,
            t.start_year DESC NULLS LAST
    """, (nconst,))

    filmography = OrderedDict()
    for row in rows:
        cat = row.pop("category")
        if cat not in filmography:
            filmography[cat] = []
        if len(filmography[cat]) < 50:  # cap per category
            filmography[cat].append(row)

    info["filmography"] = filmography
    return jsonify(info)
