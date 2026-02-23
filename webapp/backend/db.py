"""
Database connection pool using psycopg2.
Provides get_conn() / put_conn() for request-scoped connections.
"""

import os
import psycopg2
from psycopg2 import pool

_pool = None


def init_pool(minconn=2, maxconn=10):
    """Initialize the connection pool. Called once at app startup."""
    global _pool
    _pool = pool.ThreadedConnectionPool(
        minconn, maxconn,
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASS", ""),
        dbname=os.getenv("DB_NAME", "imdb_clone"),
    )


def get_conn():
    """Get a connection from the pool."""
    return _pool.getconn()


def put_conn(conn):
    """Return a connection to the pool."""
    _pool.putconn(conn)


def query(sql, params=None, one=False):
    """
    Execute a SELECT query and return results as list of dicts.
    If one=True, return a single dict or None.
    """
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        cur.close()
        results = [dict(zip(columns, row)) for row in rows]
        return results[0] if one and results else (None if one else results)
    finally:
        put_conn(conn)
