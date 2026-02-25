"""
TMDB API Service
=================
Client for The Movie Database (TMDB) API v3.
Includes in-memory caching (10-min TTL) and response normalization.
Falls back gracefully when TMDB_API_KEY is not set.
"""

import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error

def _key():
    """Read TMDB key lazily so load_dotenv() runs first."""
    return os.getenv("TMDB_API_KEY", "")

BASE = "https://api.themoviedb.org/3"
IMG = "https://image.tmdb.org/t/p"

_cache = {}
CACHE_TTL = 600  # 10 minutes


def is_available():
    return bool(_key())


def _get(endpoint, params=None):
    k = _key()
    if not k:
        return None
    p = {"api_key": k, "language": "en-US"}
    if params:
        p.update(params)
    url = f"{BASE}{endpoint}?{urllib.parse.urlencode(p)}"
    now = time.time()
    if url in _cache and now - _cache[url]["ts"] < CACHE_TTL:
        return _cache[url]["data"]
    try:
        req = urllib.request.Request(url, headers={
            "Accept": "application/json", "User-Agent": "IMDbClone/2.0"
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        _cache[url] = {"data": data, "ts": now}
        return data
    except Exception as e:
        print(f"[TMDB] Error: {e}")
        return None


def img_url(path, size="w500"):
    if not path:
        return None
    return f"{IMG}/{size}{path}"


# ── Public API functions ──

def search_multi(query, page=1):
    return _get("/search/multi", {"query": query, "page": page}) or {
        "results": [], "total_pages": 0, "page": page
    }


def discover(media_type="movie", genre=None, year=None, min_rating=None,
             sort_by="popularity.desc", page=1, include_adult=False):
    params = {"page": str(page), "sort_by": sort_by,
              "include_adult": str(include_adult).lower(),
              "vote_count.gte": "50"}
    if genre:
        params["with_genres"] = str(genre)
    if year:
        key = "first_air_date_year" if media_type == "tv" else "primary_release_year"
        params[key] = str(year)
    if min_rating:
        params["vote_average.gte"] = str(min_rating)
    return _get(f"/discover/{media_type}", params) or {
        "results": [], "total_pages": 0, "page": page
    }


def movie_details(movie_id):
    return _get(f"/movie/{movie_id}",
                {"append_to_response": "credits,watch/providers,similar"})


def tv_details(tv_id):
    return _get(f"/tv/{tv_id}",
                {"append_to_response": "credits,watch/providers,similar"})


def get_person(person_id):
    return _get(f"/person/{person_id}",
                {"append_to_response": "combined_credits"})


def get_genres(media_type="movie"):
    data = _get(f"/genre/{media_type}/list")
    return data.get("genres", []) if data else []


def get_trending(media_type="movie", time_window="week"):
    return _get(f"/trending/{media_type}/{time_window}") or {"results": []}


def get_top_rated(media_type="movie", page=1):
    return _get(f"/{media_type}/top_rated", {"page": str(page)}) or {"results": []}


def get_tv_season(tv_id, season_number):
    return _get(f"/tv/{tv_id}/season/{season_number}")


# ── Normalization helpers ──

def normalize_title(m, media_type=None):
    mt = media_type or m.get("media_type", "movie")
    is_tv = mt == "tv"
    release = m.get("first_air_date" if is_tv else "release_date", "")
    yr = int(release[:4]) if release and len(release) >= 4 else None
    rt = m.get("runtime")
    if not rt and is_tv:
        ert = m.get("episode_run_time")
        rt = ert[0] if isinstance(ert, list) and ert else None
    return {
        "id": m.get("id"),
        "title": m.get("name" if is_tv else "title", ""),
        "original_title": m.get("original_name" if is_tv else "original_title", ""),
        "media_type": mt,
        "year": yr,
        "runtime": rt,
        "poster": img_url(m.get("poster_path")),
        "backdrop": img_url(m.get("backdrop_path"), "w1280"),
        "rating": m.get("vote_average"),
        "votes": m.get("vote_count"),
        "overview": m.get("overview", ""),
        "genre_ids": m.get("genre_ids", []),
        "genres": [g["name"] for g in m.get("genres", [])],
        "adult": m.get("adult", False),
    }


def normalize_person(p):
    return {
        "id": p.get("id"),
        "name": p.get("name", ""),
        "profile": img_url(p.get("profile_path"), "w185"),
        "media_type": "person",
        "known_for_department": p.get("known_for_department", ""),
        "known_for": [normalize_title(k) for k in p.get("known_for", [])],
    }
