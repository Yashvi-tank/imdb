"""
Streaming Routes
=================
GET  /api/title/:tconst/streaming  — Get streaming links for a title
POST /api/title/:tconst/streaming  — Add a streaming link (admin)
"""

from flask import Blueprint, jsonify, request
from ..db import query, get_conn, put_conn

streaming_bp = Blueprint("streaming", __name__)

# Platform display info (icon emoji + color)
PLATFORM_INFO = {
    "netflix":       {"icon": "🔴", "color": "#E50914"},
    "amazon":        {"icon": "📦", "color": "#00A8E1"},
    "disney+":       {"icon": "🏰", "color": "#113CCF"},
    "hulu":          {"icon": "💚", "color": "#1CE783"},
    "hbo":           {"icon": "🟣", "color": "#B028C4"},
    "apple tv+":     {"icon": "🍎", "color": "#555555"},
    "paramount+":    {"icon": "⛰️", "color": "#0064FF"},
    "peacock":       {"icon": "🦚", "color": "#000000"},
    "crunchyroll":   {"icon": "🟠", "color": "#F47521"},
    "youtube":       {"icon": "▶️", "color": "#FF0000"},
}


@streaming_bp.route("/api/title/<tconst>/streaming")
def get_streaming(tconst):
    links = query("""
        SELECT platform, url
        FROM streaming_link
        WHERE tconst = %s
        ORDER BY platform
    """, (tconst,))

    # Enrich with display info
    for link in links:
        info = PLATFORM_INFO.get(link["platform"].lower(), {"icon": "🔗", "color": "#666"})
        link["icon"] = info["icon"]
        link["color"] = info["color"]

    return jsonify({"tconst": tconst, "links": links})


@streaming_bp.route("/api/title/<tconst>/streaming", methods=["POST"])
def add_streaming(tconst):
    data = request.get_json()
    if not data or not data.get("platform") or not data.get("url"):
        return jsonify({"error": "platform and url required"}), 400

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO streaming_link (tconst, platform, url)
            VALUES (%s, %s, %s)
            ON CONFLICT (tconst, platform) DO UPDATE SET url = EXCLUDED.url
        """, (tconst, data["platform"], data["url"]))
        conn.commit()
        cur.close()
        return jsonify({"status": "ok"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        put_conn(conn)
