"""
IMDb Clone — Data Analysis & Visualization
============================================
Connects to the imdb_clone database, runs analysis queries,
and generates matplotlib plots (one per analysis).

Usage:
    python analysis/imdb_analysis.py

Output: saves PNG plots to analysis/plots/
"""

import os
import sys
from pathlib import Path

import psycopg2
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
from dotenv import load_dotenv

# ── Config ──────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASS", ""),
    "dbname":   os.getenv("DB_NAME", "imdb_clone"),
}

PLOTS_DIR = Path(__file__).parent / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

# Style
plt.style.use("dark_background")
GOLD = "#f5c518"
COLORS = ["#f5c518", "#5799ef", "#e74c3c", "#4caf50", "#9b59b6",
          "#e67e22", "#1abc9c", "#e91e63", "#00bcd4", "#ff9800"]


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


# ── Analysis 1: Ratings by Decade ───────────────────────────
def plot_ratings_by_decade(conn):
    """
    Dual-axis chart: bar chart for title count per decade,
    line chart for average rating per decade.
    """
    query = """
        SELECT (t.start_year/10)*10 AS decade,
               ROUND(AVG(r.average_rating)::numeric,2) AS avg_rating,
               COUNT(*) AS titles_count
        FROM title t JOIN rating r ON r.tconst = t.tconst
        WHERE t.start_year IS NOT NULL AND t.start_year >= 1890
          AND t.title_type IN ('movie','tvSeries','tvMovie')
        GROUP BY decade ORDER BY decade
    """
    df = pd.read_sql(query, conn)
    
    fig, ax1 = plt.subplots(figsize=(14, 6))
    ax1.bar(df["decade"], df["titles_count"], width=7, color=GOLD, alpha=0.7, label="Title Count")
    ax1.set_xlabel("Decade", fontsize=12)
    ax1.set_ylabel("Number of Titles", color=GOLD, fontsize=12)
    ax1.tick_params(axis="y", labelcolor=GOLD)

    ax2 = ax1.twinx()
    ax2.plot(df["decade"], df["avg_rating"], "o-", color="#5799ef", linewidth=2, markersize=6, label="Avg Rating")
    ax2.set_ylabel("Average Rating", color="#5799ef", fontsize=12)
    ax2.tick_params(axis="y", labelcolor="#5799ef")
    ax2.set_ylim(0, 10)

    plt.title("Ratings Trend by Decade", fontsize=16, fontweight="bold", pad=15)
    fig.legend(loc="upper left", bbox_to_anchor=(0.12, 0.88))
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "ratings_by_decade.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✓ Plot saved: ratings_by_decade.png")


# ── Analysis 2: Top Directors ───────────────────────────────
def plot_top_directors(conn):
    """
    Horizontal bar chart of top 20 directors by average rating
    (minimum 5 directed titles).
    """
    query = """
        SELECT p.primary_name,
               ROUND(AVG(r.average_rating)::numeric,2) AS avg_rating,
               COUNT(*) AS movie_count
        FROM principal pr
        JOIN person p ON p.nconst = pr.nconst
        JOIN rating r ON r.tconst = pr.tconst
        WHERE pr.category = 'director'
        GROUP BY p.primary_name
        HAVING COUNT(*) >= 5
        ORDER BY avg_rating DESC LIMIT 20
    """
    df = pd.read_sql(query, conn)

    fig, ax = plt.subplots(figsize=(12, 8))
    bars = ax.barh(df["primary_name"][::-1], df["avg_rating"][::-1], color=GOLD, edgecolor="#333")
    ax.set_xlabel("Average Rating", fontsize=12)
    ax.set_xlim(0, 10)
    
    for bar, count in zip(bars, df["movie_count"][::-1]):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                f"{count} films", va="center", fontsize=9, color="#aaa")

    plt.title("Top 20 Directors by Average Rating (min 5 films)", fontsize=14, fontweight="bold", pad=15)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "top_directors.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✓ Plot saved: top_directors.png")


# ── Analysis 3: Genre Popularity ────────────────────────────
def plot_genre_popularity(conn):
    """
    Multi-line chart showing genre popularity (title count) over decades.
    Limited to genres with ≥1000 total titles for clarity.
    """
    query = """
        SELECT g.name AS genre, (t.start_year/10)*10 AS decade, COUNT(*) AS titles_count
        FROM title t
        JOIN title_genre tg ON tg.tconst = t.tconst
        JOIN genre g ON g.genre_id = tg.genre_id
        WHERE t.start_year IS NOT NULL AND t.start_year >= 1950
          AND t.title_type IN ('movie','tvSeries','tvMovie')
          AND g.name IN (
              SELECT g2.name FROM title_genre tg2
              JOIN genre g2 USING(genre_id) GROUP BY g2.name HAVING COUNT(*) >= 1000
          )
        GROUP BY g.name, decade ORDER BY g.name, decade
    """
    df = pd.read_sql(query, conn)

    fig, ax = plt.subplots(figsize=(14, 8))
    genres = df["genre"].unique()
    for i, genre in enumerate(sorted(genres)):
        gdf = df[df["genre"] == genre]
        ax.plot(gdf["decade"], gdf["titles_count"], "o-",
                color=COLORS[i % len(COLORS)], linewidth=2, markersize=4, label=genre)

    ax.set_xlabel("Decade", fontsize=12)
    ax.set_ylabel("Number of Titles", fontsize=12)
    ax.legend(bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=9)
    plt.title("Genre Popularity Over Time (1950+)", fontsize=14, fontweight="bold", pad=15)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "genre_popularity.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✓ Plot saved: genre_popularity.png")


# ── Main ────────────────────────────────────────────────────
def main():
    print("=" * 50)
    print("IMDb Clone — Data Analysis")
    print("=" * 50)

    conn = get_conn()
    try:
        print("\n[1/3] Ratings by Decade...")
        plot_ratings_by_decade(conn)

        print("[2/3] Top Directors...")
        plot_top_directors(conn)

        print("[3/3] Genre Popularity...")
        plot_genre_popularity(conn)

    finally:
        conn.close()

    print(f"\n✅ All plots saved to {PLOTS_DIR}/")


if __name__ == "__main__":
    main()
