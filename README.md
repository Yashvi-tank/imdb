# 🎬 CineVault — Cinematic Movie Discovery Platform

A premium, cinematic movie discovery platform powered by the **TMDB API** and backed by a **PostgreSQL** database. Built with a modern glass-morphic UI featuring animated backgrounds, 3D card effects, and an immersive browsing experience.

> **Live Features:** Real-time movie search, genre-based mood discovery, streaming provider links, full cast & crew details, and more.

---

## ✨ Features

### 🔍 Smart Search
- **Debounced live search** (350ms) across movies, TV shows, and people
- Powered by TMDB's multi-search API
- Falls back to local PostgreSQL database when TMDB is unavailable

### 🎭 Mood Discovery
- **10 interactive genre bubbles** with unique glow effects
- Click any mood (Action 💥, Comedy 😂, Horror 👻, Sci-Fi 🚀, etc.) to instantly discover movies
- Each bubble has a custom animated neon glow

### 🎬 Cinematic Hero Banner
- **Auto-rotating backdrop** featuring 5 trending movies
- Full-width cinematic imagery with gradient overlays
- Smooth crossfade transitions every 7 seconds

### 🃏 3D Glass Cards
- **Glassmorphism design** with frosted glass effect
- **3D tilt on hover** — cards follow your cursor with perspective transforms
- Rating badges, type overlays, and smooth image zoom

### 📖 Rich Detail Pages
- Full-width **cinematic backdrops** with dual gradient overlay
- Animated **star-glow rating badge**
- Complete **cast grid** with profile photos
- **Director & writer credits**
- **Watch provider logos** that link directly to streaming platforms

### 📺 Where to Watch
- Shows **streaming platforms** (Netflix, Disney+, Amazon, Apple TV, etc.)
- **Each logo links directly** to that platform's search for the specific movie
- Supports 15+ streaming services with smart URL mapping

### 📄 Pagination
- Full pagination for search and discover results
- Prev/Next navigation with page indicators

### ⚡ Performance
- **Zero external JS libraries** — pure vanilla JavaScript
- CSS-only animations (GPU-accelerated transforms)
- Lazy loading on all images
- In-memory API response caching (10-min TTL)
- PostgreSQL connection pooling with 10s query timeout

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python · Flask |
| **Database** | PostgreSQL · psycopg2 |
| **Frontend** | Vanilla JavaScript · HTML5 · CSS3 |
| **API** | TMDB API v3 |
| **Design** | Glassmorphism · Neon Glow · CSS Animations |

---

## 📁 Project Structure

```
imdb_database/
├── webapp/
│   ├── backend/
│   │   ├── app.py              # Flask application + blueprint registration
│   │   ├── db.py               # PostgreSQL connection pool
│   │   ├── routes/
│   │   │   ├── home.py         # GET /api/home — trending + top rated
│   │   │   ├── search.py       # GET /api/search — multi-search
│   │   │   ├── discover.py     # GET /api/discover — filtered discovery
│   │   │   ├── title.py        # GET /api/title/<id> — movie/TV detail
│   │   │   ├── person.py       # GET /api/person/<id> — person detail
│   │   │   ├── genres.py       # GET /api/genres — genre list
│   │   │   ├── series.py       # GET /api/series/<id> — episodes
│   │   │   ├── credits.py      # GET /api/credits/<id> — full cast
│   │   │   ├── stats.py        # GET /api/stats — database stats
│   │   │   └── health.py       # GET /api/health — health check
│   │   └── services/
│   │       └── tmdb.py         # TMDB API client with caching
│   └── frontend/
│       ├── index.html          # Single Page Application shell
│       └── static/
│           ├── app.js          # Frontend application logic
│           └── style.css       # Cinematic glass theme
├── schema/
│   └── schema.sql              # PostgreSQL database schema
├── run.py                      # Application entry point
├── .env                        # Environment variables (not committed)
├── .env.example                # Environment variable template
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **PostgreSQL 12+**
- **TMDB API Key** (free) — [Get one here](https://www.themoviedb.org/settings/api)

### 1. Clone the Repository

```bash
git clone https://github.com/Yashvi-tank/imdb.git
cd imdb_database
```

### 2. Set Up the Database

```sql
-- Create the database
CREATE DATABASE imdb_clone;

-- Run the schema
\i schema/schema.sql
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=imdb_clone
FLASK_PORT=5000
FLASK_DEBUG=true
TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Install Dependencies

```bash
pip install flask psycopg2-binary python-dotenv flask-cors
```

### 5. Run the Application

```bash
python run.py
```

Open **http://localhost:5000** in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_USER` | Yes | `postgres` | Database user |
| `DB_PASS` | Yes | — | Database password |
| `DB_NAME` | Yes | `imdb_clone` | Database name |
| `TMDB_API_KEY` | Recommended | — | TMDB API key for live data |
| `FLASK_PORT` | No | `5000` | Server port |
| `FLASK_DEBUG` | No | `false` | Debug mode |

> **Note:** Without `TMDB_API_KEY`, the app falls back to local database data. All TMDB-powered features (real posters, live search, streaming providers, etc.) require the key.

---

## 🎨 Design System

```
Theme: "Cinematic Glass + Neon Glow + Motion Depth"

Backgrounds:  #06060c → #0a0a14 → #10101c (deep void to surface)
Accent Cyan:  #00d4ff (primary glow, links, search)
Accent Purple:#a855f7 (filters, tags, badges)
Accent Amber: #f59e0b (ratings, stars)
Glass Effect:  rgba(16,16,30,0.55) + backdrop-filter: blur(20px)
Typography:    Inter (300–900 weights)
```

### Key Visual Features
- 🌊 **Animated ambient background** — slow-drifting radial gradients
- 🪟 **Glassmorphism** — frosted glass cards, navbar, and panels
- 💫 **3D tilt cards** — perspective transforms following cursor position
- ✨ **Neon glow effects** — focus states, hover interactions, star ratings
- 🎯 **Ripple effects** — material-style click feedback on buttons
- 🎠 **Scroll animations** — fade + slide entrance on scroll

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/home` | Trending + Top Rated movies |
| `GET` | `/api/search?q=&page=` | Multi-search (movies, TV, people) |
| `GET` | `/api/discover?type=&genre=&year=&rating=&sort=&page=` | Filtered discovery |
| `GET` | `/api/title/<id>?type=` | Movie/TV detail with cast, providers, similar |
| `GET` | `/api/person/<id>` | Person detail with filmography |
| `GET` | `/api/genres` | Genre list |
| `GET` | `/api/series/<id>/seasons` | Season list |
| `GET` | `/api/series/<id>/season/<num>` | Episode details |

---

## 📸 Screenshots

| Home — Hero Banner & Mood Discovery | Movie Detail — Cinematic View |
|---|---|
| Hero banner auto-rotates through trending movies. Mood bubbles glow on hover. | Full backdrop, cast grid, watch providers with direct links. |

| Search Results | Mood Discovery |
|---|---|
| Live search with debounce, real posters, pagination. | 10 genre bubbles with unique glow colors. |

---

## 🧑‍💻 Developer

**Yashvi Tank**

- GitHub: [@Yashvi-tank](https://github.com/Yashvi-tank)

---

## 📜 License

This project is for educational purposes as part of the **Relational Database** course at **EPITA**.

---

## 🙏 Acknowledgments

- [TMDB (The Movie Database)](https://www.themoviedb.org/) — Movie data and images
- [Inter Font](https://fonts.google.com/specimen/Inter) — Typography
- [PostgreSQL](https://www.postgresql.org/) — Database engine
- [Flask](https://flask.palletsprojects.com/) — Python web framework

---

<p align="center">
  Built with 🎬 by <strong>Yashvi Tank</strong> · Powered by <a href="https://www.themoviedb.org/">TMDB</a>
</p>
