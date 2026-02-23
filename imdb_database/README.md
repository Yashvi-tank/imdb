# IMDb Clone & Data Analysis

A full-stack project to build an IMDb-like web application with comprehensive data import, SQL query development, and data analysis features. This repository contains everything from schema design and data-loading scripts to a React front end (or server-rendered templates) and Python-based visualizations.

---

## 📌 Project Overview

- **Objective**: Create an IMDb clone that lets users browse movies and TV series, view cast & crew, filter adult content, and explore data-driven analyses on ratings, genres, and directors.
- **Components**:

  1. **Database**: Design relational schema, import IMDb TSV datasets.
  2. **Web App**: Backend (Node.js/Express or Django/Flask), frontend (React + Tailwind or templates).
  3. **Data Analysis**: SQL queries and Python notebooks to generate visualizations (matplotlib).

---

## 🚀 Features

- **Movie & Series Pages**: Summary, details, cast & crew listings.
- **Episode Views**: Detailed episode metadata for TV series.
- **Adult-Content Toggle**: Cookie-or-flag-based filtering globally.
- **Data Insights**:

  - Decade-by-decade rating trends.
  - Directors’ average ratings.
  - Genre popularity over time.

---

## 🛠️ Tech Stack

- **Database**: PostgreSQL (or MySQL)
- **Backend**: Node.js + Express (or Python + Flask/Django)
- **Frontend**: React + Tailwind CSS (or server-rendered templates)
- **Analysis**: Python, pandas, matplotlib
- **Version Control**: Git & GitHub

---

## 📂 Repository Structure

```
project-root/
├── README.md            # Project overview (this file)
├── schema/              # ER diagrams & SQL schema definitions
├── import/              # Data import scripts and loaders
├── queries/
│   ├── web_queries.sql      # SQL for web application endpoints
│   └── analysis_queries.sql # SQL for data analysis tasks
├── docs/                # Markdown explanations & methodology notes
├── webapp/              # Backend + Frontend source code
└── analysis/            # Jupyter notebooks & visualization outputs
```

---

## 🎯 Getting Started

### Prerequisites

- **Git**
- **Node.js & npm** (if using JavaScript backend)
- **Python 3.8+**
- **PostgreSQL 12+**

  - Create a new database:

    ```sql
    CREATE DATABASE imdb_clone;
    ```

  - Update `webapp/.env` with your connection string.

4. **Import data**

   ```bash
   # From project root\ ncd import
   cd import
   ./load_data.sh
   ```

---

## 🗃️ Database & Schema

1. **Define schema** in `schema/schema.sql` and visualize ERD in `schema/schema.png`.
2. **Bulk load** TSV files from IMDb’s non-commercial dataset via `COPY` commands.
3. **Validate** record counts and perform spot checks.

---

---

## 📊 Data Analysis

- Query scripts are in `queries/analysis_queries.sql`.
- Use Jupyter notebooks in `analysis/` to connect, fetch results, and generate plots.
- Plots created with matplotlib (one plot per notebook cell).

---
