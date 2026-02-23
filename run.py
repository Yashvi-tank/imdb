"""
Run the IMDb Clone Flask server.
Usage:  python run.py
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from webapp.backend.app import create_app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"\n🎬 IMDb Clone running at http://localhost:{port}")
    print(f"   Health check: http://localhost:{port}/api/health\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
