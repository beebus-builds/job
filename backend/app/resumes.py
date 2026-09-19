"""Resume profiles store — save once, reuse across Matcher + bulk ranking.

Ownership model (matches tracker.py):
- Authenticated users see/manage ONLY rows where user_id = their id.
- Guests (no token) operate on the shared legacy pool (user_id IS NULL).
- Every read/update/delete is scoped by owner — no cross-user access by ID.
"""
from __future__ import annotations

import sqlite3
import time
from .db import path as db_path

DB = db_path()


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS resumes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT 'My Resume', text TEXT DEFAULT '',
      user_id INTEGER,
      created_at REAL, updated_at REAL)""")
    try:
        c.execute("ALTER TABLE resumes ADD COLUMN user_id INTEGER")
    except Exception:
        pass
    c.execute("CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id)")
    return c


def _owned(resume_id: int, user_id: int | None) -> tuple[str, tuple]:
    """WHERE clause restricting a resume id to its owner (or the guest pool)."""
    if user_id is None:
        return "id=? AND user_id IS NULL", (resume_id,)
    return "id=? AND user_id=?", (resume_id, user_id)


def list_all(user_id: int | None = None) -> list[dict]:
    c = _conn()
    if user_id:
        rows = c.execute("SELECT id, name, length(text) AS chars, substr(text,1,300) AS preview, updated_at FROM resumes WHERE user_id=? ORDER BY updated_at DESC", (user_id,)).fetchall()
    else:
        rows = c.execute("SELECT id, name, length(text) AS chars, substr(text,1,300) AS preview, updated_at FROM resumes WHERE user_id IS NULL ORDER BY updated_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]


def get(resume_id: int, user_id: int | None = None) -> dict | None:
    c = _conn()
    where, args = _owned(resume_id, user_id)
    row = c.execute(f"SELECT * FROM resumes WHERE {where}", args).fetchone()
    c.close()
    return dict(row) if row else None


def create(name: str, text: str, user_id: int | None = None) -> dict:
    now = time.time()
    c = _conn()
    cur = c.execute("INSERT INTO resumes(name,text,created_at,updated_at,user_id) VALUES(?,?,?,?,?)",
                    (name or "My Resume", text or "", now, now, user_id))
    c.commit()
    row = c.execute("SELECT * FROM resumes WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    return dict(row)


def update(resume_id: int, patch: dict, user_id: int | None = None) -> dict | None:
    c = _conn()
    where, args = _owned(resume_id, user_id)
    if not c.execute(f"SELECT id FROM resumes WHERE {where}", args).fetchone():
        c.close()
        return None
    fields = {k: patch[k] for k in ("name", "text") if k in patch}
    fields["updated_at"] = time.time()
    c.execute(f"UPDATE resumes SET {', '.join(f'{k}=?' for k in fields)} WHERE {where}",
              (*fields.values(), *args))
    c.commit()
    row = c.execute(f"SELECT * FROM resumes WHERE {where}", args).fetchone()
    c.close()
    return dict(row) if row else None


def remove(resume_id: int, user_id: int | None = None) -> bool:
    c = _conn()
    where, args = _owned(resume_id, user_id)
    cur = c.execute(f"DELETE FROM resumes WHERE {where}", args)
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok
