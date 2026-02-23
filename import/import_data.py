"""
IMDb TSV Data Importer
======================
Bulk-loads IMDb .tsv files into PostgreSQL using COPY via psycopg2.
Handles \\N → NULL conversion, genre normalization, and progress reporting.

Usage:
    python import_data.py

Expects .env file in project root with DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME.
Expects TSV files in ../import/data/ relative to this script, OR specify TSV_DIR env var.
"""

import os
import sys
import csv
import time
import psycopg2
from psycopg2 import sql
from io import StringIO
from pathlib import Path
from dotenv import load_dotenv

# ── Config ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASS", ""),
    "dbname":   os.getenv("DB_NAME", "imdb_clone"),
}

TSV_DIR = Path(os.getenv("TSV_DIR", PROJECT_ROOT.parent / "import" / "data"))

BATCH_SIZE = 50_000  # rows per COPY batch


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


def clean(val):
    """Convert IMDb's \\N to None (SQL NULL)."""
    if val == "\\N" or val == "":
        return None
    return val


def timer(label):
    """Context manager to time operations."""
    class Timer:
        def __enter__(self):
            self.start = time.time()
            print(f"  → {label}...", end=" ", flush=True)
            return self
        def __exit__(self, *args):
            elapsed = time.time() - self.start
            print(f"done ({elapsed:.1f}s)")
    return Timer()


# ── Import Functions ────────────────────────────────────────────────────

def import_titles(conn):
    """
    Import title.basics.tsv → title table + genre/title_genre tables.
    
    TSV columns: tconst, titleType, primaryTitle, originalTitle, isAdult,
                 startYear, endYear, runtimeMinutes, genres
    """
    tsv_path = TSV_DIR / "title.basics.tsv"
    if not tsv_path.exists():
        print(f"  ⚠ {tsv_path} not found, skipping titles.")
        return

    cur = conn.cursor()
    
    # Collect genres and title-genre mappings
    genres_set = set()
    title_buf = StringIO()
    genre_links = []  # (tconst, genre_name)
    
    with timer("Reading title.basics.tsv"):
        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            count = 0
            for row in reader:
                tconst = row["tconst"]
                title_type = clean(row["titleType"])
                primary_title = clean(row["primaryTitle"])
                original_title = clean(row["originalTitle"])
                is_adult = row["isAdult"] == "1"
                start_year = clean(row["startYear"])
                end_year = clean(row["endYear"])
                runtime = clean(row["runtimeMinutes"])
                genres_raw = clean(row["genres"])

                # Write to COPY buffer: tconst, title_type, primary_title, original_title, is_adult, start_year, end_year, runtime_minutes
                line = "\t".join([
                    tconst,
                    title_type or "\\N",
                    (primary_title or "\\N").replace("\t", " ").replace("\n", " "),
                    (original_title or "\\N").replace("\t", " ").replace("\n", " "),
                    "t" if is_adult else "f",
                    start_year if start_year else "\\N",
                    end_year if end_year else "\\N",
                    runtime if runtime else "\\N",
                ])
                title_buf.write(line + "\n")

                # Collect genres
                if genres_raw:
                    for g in genres_raw.split(","):
                        g = g.strip()
                        if g:
                            genres_set.add(g)
                            genre_links.append((tconst, g))
                
                count += 1
                if count % 500_000 == 0:
                    print(f"    read {count:,} titles...", flush=True)

    with timer(f"COPY {count:,} titles into title table"):
        title_buf.seek(0)
        cur.copy_from(
            title_buf, "title",
            columns=("tconst", "title_type", "primary_title", "original_title",
                     "is_adult", "start_year", "end_year", "runtime_minutes"),
            null="\\N"
        )
        conn.commit()

    # Insert genres
    with timer(f"Inserting {len(genres_set)} genres"):
        for g in sorted(genres_set):
            cur.execute(
                "INSERT INTO genre(name) VALUES (%s) ON CONFLICT(name) DO NOTHING",
                (g,)
            )
        conn.commit()

    # Build genre_id lookup
    cur.execute("SELECT name, genre_id FROM genre")
    genre_map = dict(cur.fetchall())

    # Insert title_genre links
    with timer(f"COPY {len(genre_links):,} title-genre links"):
        tg_buf = StringIO()
        for tconst, gname in genre_links:
            gid = genre_map.get(gname)
            if gid:
                tg_buf.write(f"{tconst}\t{gid}\n")
        tg_buf.seek(0)
        cur.copy_from(tg_buf, "title_genre", columns=("tconst", "genre_id"))
        conn.commit()

    cur.close()
    print(f"  ✓ Imported {count:,} titles, {len(genres_set)} genres, {len(genre_links):,} genre links.")


def import_ratings(conn):
    """
    Import title.ratings.tsv → rating table.
    
    TSV columns: tconst, averageRating, numVotes
    Only imports ratings for titles that exist in the title table.
    """
    tsv_path = TSV_DIR / "title.ratings.tsv"
    if not tsv_path.exists():
        print(f"  ⚠ {tsv_path} not found, skipping ratings.")
        return

    cur = conn.cursor()

    buf = StringIO()
    count = 0
    with timer("Reading title.ratings.tsv"):
        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            for row in reader:
                tconst = row["tconst"]
                avg_rating = clean(row["averageRating"])
                num_votes = clean(row["numVotes"])
                if avg_rating and num_votes:
                    buf.write(f"{tconst}\t{avg_rating}\t{num_votes}\n")
                    count += 1

    with timer(f"COPY {count:,} ratings"):
        buf.seek(0)
        # Use a temp table approach to skip ratings for non-existent titles
        cur.execute("""
            CREATE TEMP TABLE tmp_rating (
                tconst VARCHAR(12),
                average_rating NUMERIC(3,1),
                num_votes INTEGER
            ) ON COMMIT DROP
        """)
        cur.copy_from(buf, "tmp_rating", columns=("tconst", "average_rating", "num_votes"))
        cur.execute("""
            INSERT INTO rating (tconst, average_rating, num_votes)
            SELECT t.tconst, tr.average_rating, tr.num_votes
            FROM tmp_rating tr
            JOIN title t ON t.tconst = tr.tconst
            ON CONFLICT (tconst) DO UPDATE SET
                average_rating = EXCLUDED.average_rating,
                num_votes = EXCLUDED.num_votes
        """)
        conn.commit()

    cur.close()
    print(f"  ✓ Imported {count:,} ratings.")


def import_people(conn):
    """
    Import name.basics.tsv → person table.
    
    TSV columns: nconst, primaryName, birthYear, deathYear, primaryProfession, knownForTitles
    We only import nconst, primaryName, birthYear, deathYear.
    """
    tsv_path = TSV_DIR / "name.basics.tsv"
    if not tsv_path.exists():
        print(f"  ⚠ {tsv_path} not found, skipping people.")
        return

    cur = conn.cursor()
    buf = StringIO()
    count = 0

    with timer("Reading name.basics.tsv"):
        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            for row in reader:
                nconst = row["nconst"]
                name = (clean(row["primaryName"]) or "Unknown").replace("\t", " ").replace("\n", " ")
                birth = clean(row["birthYear"])
                death = clean(row["deathYear"])
                buf.write(f"{nconst}\t{name}\t{birth or '\\N'}\t{death or '\\N'}\n")
                count += 1
                if count % 500_000 == 0:
                    print(f"    read {count:,} people...", flush=True)

    with timer(f"COPY {count:,} people"):
        buf.seek(0)
        cur.copy_from(
            buf, "person",
            columns=("nconst", "primary_name", "birth_year", "death_year"),
            null="\\N"
        )
        conn.commit()

    cur.close()
    print(f"  ✓ Imported {count:,} people.")


def import_principals(conn):
    """
    Import title.principals.tsv → principal table.
    
    TSV columns: tconst, ordering, nconst, category, job, characters
    Only imports rows where both tconst and nconst exist in their respective tables.
    """
    tsv_path = TSV_DIR / "title.principals.tsv"
    if not tsv_path.exists():
        print(f"  ⚠ {tsv_path} not found, skipping principals.")
        return

    cur = conn.cursor()

    # Load using temp table to handle FK mismatches
    with timer("Reading title.principals.tsv"):
        cur.execute("""
            CREATE TEMP TABLE tmp_principal (
                tconst VARCHAR(12),
                ordering SMALLINT,
                nconst VARCHAR(12),
                category VARCHAR(30),
                job TEXT,
                characters TEXT
            )
        """)
        
        buf = StringIO()
        count = 0
        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            for row in reader:
                tconst = row["tconst"]
                ordering = row["ordering"]
                nconst = row["nconst"]
                category = clean(row["category"]) or "unknown"
                job = clean(row["job"])
                characters = clean(row["characters"])
                
                # Escape tabs and newlines in text fields
                if job:
                    job = job.replace("\t", " ").replace("\n", " ")
                if characters:
                    characters = characters.replace("\t", " ").replace("\n", " ")
                
                buf.write("\t".join([
                    tconst, ordering, nconst,
                    category,
                    job if job else "\\N",
                    characters if characters else "\\N"
                ]) + "\n")
                count += 1
                
                if count % 1_000_000 == 0:
                    print(f"    read {count:,} principals...", flush=True)
                    # Flush in batches to avoid huge memory usage
                    buf.seek(0)
                    cur.copy_from(buf, "tmp_principal",
                                  columns=("tconst", "ordering", "nconst", "category", "job", "characters"),
                                  null="\\N")
                    buf = StringIO()

        # Final batch
        if buf.tell() > 0:
            buf.seek(0)
            cur.copy_from(buf, "tmp_principal",
                          columns=("tconst", "ordering", "nconst", "category", "job", "characters"),
                          null="\\N")

    with timer(f"Inserting {count:,} principals (FK-safe)"):
        cur.execute("""
            INSERT INTO principal (tconst, ordering, nconst, category, job, characters)
            SELECT tp.tconst, tp.ordering, tp.nconst, tp.category, tp.job, tp.characters
            FROM tmp_principal tp
            WHERE EXISTS (SELECT 1 FROM title t WHERE t.tconst = tp.tconst)
              AND EXISTS (SELECT 1 FROM person p WHERE p.nconst = tp.nconst)
            ON CONFLICT (tconst, ordering) DO NOTHING
        """)
        conn.commit()

    cur.execute("DROP TABLE IF EXISTS tmp_principal")
    conn.commit()
    cur.close()
    print(f"  ✓ Imported principals from {count:,} rows.")


# ── Main ────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("IMDb Clone — Data Import")
    print("=" * 60)
    print(f"Database: {DB_CONFIG['dbname']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"TSV dir:  {TSV_DIR}")
    print()

    if not TSV_DIR.exists():
        print(f"ERROR: TSV directory not found: {TSV_DIR}")
        sys.exit(1)

    conn = get_conn()
    conn.autocommit = False

    try:
        print("\n[1/4] Importing titles + genres...")
        import_titles(conn)

        print("\n[2/4] Importing people...")
        import_people(conn)

        print("\n[3/4] Importing ratings...")
        import_ratings(conn)

        print("\n[4/4] Importing principals (cast & crew)...")
        import_principals(conn)

        # Final counts
        cur = conn.cursor()
        for table in ["title", "person", "rating", "principal", "genre", "title_genre"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"  {table}: {cur.fetchone()[0]:,} rows")
        cur.close()

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        conn.close()

    print("\n✅ Import complete!")


if __name__ == "__main__":
    main()
