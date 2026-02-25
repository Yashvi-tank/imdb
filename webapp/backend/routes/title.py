"""
Title (Detail) — TMDB movie/TV detail with local DB fallback.
GET /api/title/<id>?type=movie|tv
GET /api/title/<id>/full-credits
"""
from flask import Blueprint, jsonify, request
from ..db import query
from ..services import tmdb
from collections import OrderedDict

title_bp = Blueprint("title", __name__)

PLACEHOLDER = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
    "viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231a1a2e'/%3E"
    "%3Ctext x='150' y='225' text-anchor='middle' fill='%23555' font-size='16' "
    "font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E")


def _is_local_id(tid):
    return isinstance(tid, str) and tid.startswith("tt")


@title_bp.route("/api/title/<tid>")
def title_summary(tid):
    media_type = request.args.get("type", "movie")

    # ── TMDB path ──
    if tmdb.is_available() and not _is_local_id(tid):
        try:
            tmdb_id = int(tid)
        except ValueError:
            return jsonify({"error": "Invalid ID"}), 400

        raw = tmdb.movie_details(tmdb_id) if media_type != "tv" else tmdb.tv_details(tmdb_id)
        if not raw:
            return jsonify({"error": "Title not found"}), 404

        info = tmdb.normalize_title(raw, media_type)

        # Credits
        credits = raw.get("credits", {})
        cast = [{
            "id": c["id"], "name": c["name"], "character": c.get("character", ""),
            "profile": tmdb.img_url(c.get("profile_path"), "w185"),
        } for c in credits.get("cast", [])[:20]]

        directors = [{"id": c["id"], "name": c["name"]}
                     for c in credits.get("crew", []) if c.get("job") == "Director"]
        writers = [{"id": c["id"], "name": c["name"]}
                   for c in credits.get("crew", [])
                   if c.get("job") in ("Screenplay", "Writer", "Story")]

        # Watch providers
        wp = raw.get("watch/providers", {}).get("results", {})
        providers = []
        watch_link = ""
        for country in ("US", "GB", "FR", "DE", "IN"):
            cp = wp.get(country)
            if cp:
                watch_link = cp.get("link", "")
                for prov in cp.get("flatrate", []) + cp.get("rent", []) + cp.get("buy", []):
                    name = prov.get("provider_name", "")
                    if not any(p["name"] == name for p in providers):
                        providers.append({
                            "name": name,
                            "logo": tmdb.img_url(prov.get("logo_path"), "w92"),
                        })
                if providers:
                    break

        # Similar
        similar = [tmdb.normalize_title(s, media_type)
                   for s in raw.get("similar", {}).get("results", [])[:10]]

        info.update({
            "cast": cast, "directors": directors, "writers": writers,
            "providers": providers, "watch_link": watch_link,
            "similar": similar, "source": "tmdb",
            "tagline": raw.get("tagline", ""),
            "status": raw.get("status", ""),
            "number_of_seasons": raw.get("number_of_seasons"),
        })
        return jsonify(info)

    # ── Local DB fallback ──
    info = query("""
        SELECT t.tconst AS id, t.primary_title AS title, t.original_title,
               t.title_type AS media_type, t.start_year AS year, t.end_year,
               t.runtime_minutes AS runtime, t.is_adult AS adult,
               t.poster_url AS poster, r.average_rating AS rating, r.num_votes AS votes
        FROM title t LEFT JOIN rating r ON r.tconst=t.tconst
        WHERE t.tconst=%s
    """, (tid,), one=True)
    if not info:
        return jsonify({"error": "Title not found"}), 404
    if not info.get("poster"):
        info["poster"] = PLACEHOLDER
    genres = query("SELECT g.name FROM title_genre tg JOIN genre g USING(genre_id) WHERE tg.tconst=%s ORDER BY g.name", (tid,))
    info["genres"] = [g["name"] for g in genres]
    crew = query("""
        SELECT p.nconst AS id, p.primary_name AS name, pr.category
        FROM principal pr JOIN person p ON p.nconst=pr.nconst
        WHERE pr.tconst=%s AND pr.category IN ('director','writer')
        ORDER BY pr.ordering
    """, (tid,))
    info["directors"] = [c for c in crew if c["category"] == "director"]
    info["writers"] = [c for c in crew if c["category"] == "writer"]
    cast = query("""
        SELECT p.nconst AS id, p.primary_name AS name, pr.characters AS character
        FROM principal pr JOIN person p ON p.nconst=pr.nconst
        WHERE pr.tconst=%s AND pr.category IN ('actor','actress')
        ORDER BY pr.ordering LIMIT 15
    """, (tid,))
    info["cast"] = cast
    info["providers"] = []
    info["similar"] = []
    info["source"] = "local"
    return jsonify(info)


@title_bp.route("/api/title/<tid>/full-credits")
def full_credits(tid):
    media_type = request.args.get("type", "movie")

    if tmdb.is_available() and not _is_local_id(tid):
        try:
            tmdb_id = int(tid)
        except ValueError:
            return jsonify({"error": "Invalid ID"}), 400
        raw = tmdb.movie_details(tmdb_id) if media_type != "tv" else tmdb.tv_details(tmdb_id)
        if not raw:
            return jsonify({"error": "Not found"}), 404
        credits = raw.get("credits", {})
        cast = [{"id": c["id"], "name": c["name"], "character": c.get("character", ""),
                 "profile": tmdb.img_url(c.get("profile_path"), "w185")} for c in credits.get("cast", [])]
        crew_groups = OrderedDict()
        for c in credits.get("crew", []):
            dept = c.get("department", "Other")
            if dept not in crew_groups:
                crew_groups[dept] = []
            crew_groups[dept].append({"id": c["id"], "name": c["name"], "job": c.get("job", "")})
        title = raw.get("title") or raw.get("name", "")
        return jsonify({"id": tmdb_id, "title": title, "cast": cast, "crew": crew_groups, "source": "tmdb"})

    # Local fallback
    info = query("SELECT tconst AS id, primary_title AS title FROM title WHERE tconst=%s", (tid,), one=True)
    if not info:
        return jsonify({"error": "Not found"}), 404
    rows = query("""
        SELECT pr.category, p.nconst AS id, p.primary_name AS name, pr.job, pr.characters AS character, pr.ordering
        FROM principal pr JOIN person p ON p.nconst=pr.nconst
        WHERE pr.tconst=%s ORDER BY pr.ordering
    """, (tid,))
    credits_grouped = OrderedDict()
    for r in rows:
        cat = r["category"]
        if cat not in credits_grouped:
            credits_grouped[cat] = []
        credits_grouped[cat].append(r)
    return jsonify({"id": info["id"], "title": info["title"], "credits": credits_grouped, "source": "local"})
