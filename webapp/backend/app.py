"""
IMDb Clone — Flask Backend
===========================
Main entry point. Registers all route blueprints, sets up DB pool,
CORS, request timing middleware, error handling, and serves the
frontend static files.
"""

import os
import time
from pathlib import Path
from flask import Flask, g, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

from .db import init_pool
from .routes.health import health_bp
from .routes.home import home_bp
from .routes.title import title_bp
from .routes.series import series_bp
from .routes.person import person_bp
from .routes.search import search_bp
from .routes.posters import poster_bp
from .routes.streaming import streaming_bp
from .routes.genres import genres_bp


def create_app():
    app = Flask(__name__, static_folder=str(FRONTEND_DIR / "static"))
    CORS(app)

    # Initialize DB pool
    init_pool()

    # ── Serve frontend ──
    @app.route("/")
    def index():
        return send_from_directory(str(FRONTEND_DIR), "index.html")

    @app.route("/static/<path:filename>")
    def static_files(filename):
        return send_from_directory(str(FRONTEND_DIR / "static"), filename)

    # ── Request timing middleware ──
    @app.before_request
    def before():
        g.start_time = time.time()

    @app.after_request
    def after(response):
        if hasattr(g, "start_time"):
            elapsed = (time.time() - g.start_time) * 1000
            response.headers["X-Response-Time"] = f"{elapsed:.0f}ms"
            if elapsed > 2000:
                app.logger.warning(f"SLOW REQUEST: {elapsed:.0f}ms")
        return response

    # ── Error handlers ──
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # ── Register blueprints ──
    app.register_blueprint(health_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(title_bp)
    app.register_blueprint(series_bp)
    app.register_blueprint(person_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(poster_bp)
    app.register_blueprint(streaming_bp)
    app.register_blueprint(genres_bp)

    return app
