"""
Health Check Route
==================
GET /api/health — Verifies server is running and DB is reachable.

Response: { "status": "ok"|"error", "db": "connected"|"error message", "uptime_s": float }
"""

import time
from flask import Blueprint, jsonify
from ..db import get_conn, put_conn

health_bp = Blueprint("health", __name__)
_start_time = time.time()


@health_bp.route("/api/health")
def health():
    db_status = "unknown"
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        put_conn(conn)
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    return jsonify({
        "status": "ok" if db_status == "connected" else "error",
        "db": db_status,
        "uptime_s": round(time.time() - _start_time, 1),
    })
