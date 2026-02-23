# IMDb Clone & Data Analysis

A full-stack IMDb-like web application with comprehensive data import, SQL queries, and data analysis.

---

## 📂 Repository Structure

```
imdb_database/
├── .env                    # Database credentials (not committed)
├── .env.example            # Template for .env
├── .gitignore
├── requirements.txt        # Python dependencies
├── run.py                  # Start Flask server
├── schema/
│   └── schema.sql          # Database schema (7 tables + indexes)
├── import/
│   ├── import_data.py      # Bulk-load IMDb TSV files
│   └── seed_test_data.sql  # Small test dataset (no TSVs needed)
├── queries/
│   ├── web_queries.sql     # 12 documented web endpoint queries
│   └── analysis_queries.sql# 4 documented analysis queries
├── webapp/
│   ├── backend/
│   │   ├── app.py          # Flask app (CORS, timing, routes)
│   │   ├── db.py           # PostgreSQL connection pool
│   │   └── routes/         # API route blueprints
│   │       ├── health.py   # GET /api/health
│   │       ├── home.py     # GET /api/home
│   │       ├── title.py    # GET /api/title/:tconst (+ full-credits)
│   │       ├── series.py   # GET /api/series/:tconst/seasons|episodes
│   │       ├── person.py   # GET /api/person/:nconst
│   │       └── search.py   # GET /api/search?q=...
│   └── frontend/
│       ├── index.html      # Single-page app
│       └── static/
│           ├── style.css   # Dark theme + gold accents
│           └── app.js      # SPA router + page renderers
├── analysis/
│   └── imdb_analysis.py    # 3 matplotlib visualizations
├── docs/
│   ├── schema.md           # Schema documentation + ER diagram
│   └── queries.md          # Query documentation (purpose, design)
└── IMDB_Clone_SQL_Query_Report.docx
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+**
- **PostgreSQL 12+**

### 1. Create Database
```sql
CREATE DATABASE imdb_clone;
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Apply Schema
```bash
psql -U postgres -d imdb_clone -f schema/schema.sql
```

### 5. Load Data (choose one)

**Option A — Test data** (instant, no TSV files needed):
```bash
psql -U postgres -d imdb_clone -f import/seed_test_data.sql
```

**Option B — Full IMDb data** (requires downloaded TSV files):
```bash
# Place TSV files in: <parent>/import/data/
# Files: title.basics.tsv, name.basics.tsv, title.ratings.tsv, title.principals.tsv
python import/import_data.py
```

### 6. Run the App
```bash
python run.py
```
Open: **http://localhost:5000**

### 7. Run Analysis
```bash
python analysis/imdb_analysis.py
# Plots saved to analysis/plots/
```

---

## 🌐 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Server + DB connectivity check |
| `GET /api/home` | Top Rated + Most Voted (cached 5min) |
| `GET /api/title/:tconst` | Title summary: info, rating, genres, crew, cast |
| `GET /api/title/:tconst/full-credits` | Full cast & crew grouped by category |
| `GET /api/series/:tconst/seasons` | List of seasons for a series |
| `GET /api/series/:tconst/episodes?season=N` | Episodes in a season |
| `GET /api/person/:nconst` | Person info + filmography by role |
| `GET /api/search?q=...&type=movie\|series\|person` | Search with pagination |

All listing endpoints support `?includeAdult=true` (default: false).

---

## 📊 Data Analysis

Three analyses with matplotlib visualizations:
1. **Ratings by Decade** — dual-axis chart (count + avg rating)
2. **Top Directors** — horizontal bar chart (min 5 films)
3. **Genre Popularity** — multi-line chart over decades (1950+)

---

## 🛠️ Tech Stack

- **Database**: PostgreSQL 12+
- **Backend**: Python 3 + Flask + psycopg2
- **Frontend**: Vanilla HTML/CSS/JS (SPA)
- **Analysis**: pandas + matplotlib
