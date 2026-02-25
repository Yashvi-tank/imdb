"""
Person — TMDB person detail with local DB fallback.
GET /api/person/<id>
"""
from flask import Blueprint, jsonify
from ..db import query
from ..services import tmdb
from collections import OrderedDict

person_bp = Blueprint("person", __name__)


def _is_local_id(pid):
    return isinstance(pid, str) and pid.startswith("nm")


@person_bp.route("/api/person/<pid>")
def person_detail(pid):
    if tmdb.is_available() and not _is_local_id(pid):
        try:
            tmdb_id = int(pid)
        except ValueError:
            return jsonify({"error": "Invalid ID"}), 400
        raw = tmdb.get_person(tmdb_id)
        if not raw:
            return jsonify({"error": "Person not found"}), 404

        credits = raw.get("combined_credits", {})
        cast_roles = sorted(credits.get("cast", []),
                            key=lambda x: x.get("release_date") or x.get("first_air_date") or "",
                            reverse=True)
        filmography = []
        for c in cast_roles[:60]:
            mt = c.get("media_type", "movie")
            is_tv = mt == "tv"
            filmography.append({
                "id": c["id"], "media_type": mt,
                "title": c.get("name" if is_tv else "title", ""),
                "year": (c.get("first_air_date" if is_tv else "release_date") or "")[:4] or None,
                "character": c.get("character", ""),
                "poster": tmdb.img_url(c.get("poster_path")),
                "rating": c.get("vote_average"),
            })

        return jsonify({
            "id": raw["id"],
            "name": raw.get("name", ""),
            "profile": tmdb.img_url(raw.get("profile_path"), "w500"),
            "biography": raw.get("biography", ""),
            "birthday": raw.get("birthday"),
            "deathday": raw.get("deathday"),
            "place_of_birth": raw.get("place_of_birth", ""),
            "known_for_department": raw.get("known_for_department", ""),
            "filmography": filmography,
            "source": "tmdb",
        })

    # Local DB fallback
    info = query("SELECT nconst AS id, primary_name AS name, birth_year, death_year FROM person WHERE nconst=%s", (pid,), one=True)
    if not info:
        return jsonify({"error": "Person not found"}), 404
    rows = query("""
        SELECT pr.category, t.tconst AS id, t.primary_title AS title, t.title_type AS media_type,
               t.start_year AS year, r.average_rating AS rating, pr.characters AS character
        FROM principal pr JOIN title t ON t.tconst=pr.tconst
        LEFT JOIN rating r ON r.tconst=t.tconst
        WHERE pr.nconst=%s ORDER BY t.start_year DESC NULLS LAST
    """, (pid,))
    filmography = OrderedDict()
    for r in rows:
        cat = r.pop("category")
        if cat not in filmography:
            filmography[cat] = []
        if len(filmography[cat]) < 50:
            filmography[cat].append(r)
    info["filmography"] = filmography
    info["source"] = "local"
    return jsonify(info)
