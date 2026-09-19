"""SQLite-backed application tracker (zero-config)."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from .db import path as db_path

DB = db_path()


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS applications(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT, url TEXT,
      status TEXT DEFAULT 'saved', notes TEXT DEFAULT '',
      score INTEGER DEFAULT 0, created_at REAL, updated_at REAL)""")
    try:
        c.execute("ALTER TABLE applications ADD COLUMN user_id INTEGER")
    except Exception:
        pass
    return c


def _scope(user_id: int | None) -> tuple[str, tuple]:
    return ("user_id=?", (user_id,)) if user_id else ("user_id IS NULL", ())


def list_all(user_id: int | None = None) -> list[dict]:
    c = _conn()
    where, args = _scope(user_id)
    rows = c.execute(f"SELECT * FROM applications WHERE {where} ORDER BY updated_at DESC", args).fetchall()
    c.close()
    return [dict(r) for r in rows]


def create(item: dict, user_id: int | None = None) -> dict:
    now = time.time()
    c = _conn()
    cur = c.execute(
        "INSERT INTO applications(title,company,location,url,status,notes,score,created_at,updated_at,user_id)"
        " VALUES(?,?,?,?,?,?,?,?,?,?)",
        (item.get("title", ""), item.get("company", ""), item.get("location", ""),
         item.get("url", ""), item.get("status", "saved"), item.get("notes", ""),
         item.get("score", 0), now, now, user_id))
    c.commit()
    row = c.execute("SELECT * FROM applications WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    return dict(row)


def update(app_id: int, patch: dict, user_id: int | None = None) -> dict | None:
    c = _conn()
    where, args = _scope(user_id)
    row = c.execute(f"SELECT * FROM applications WHERE id=? AND {where}", (app_id, *args)).fetchone()
    if not row:
        c.close()
        return None
    fields = {k: patch[k] for k in ("title", "company", "location", "url", "status", "notes", "score") if k in patch}
    fields["updated_at"] = time.time()
    sets = ", ".join(f"{k}=?" for k in fields)
    c.execute(f"UPDATE applications SET {sets} WHERE id=?", (*fields.values(), app_id))
    c.commit()
    row = c.execute("SELECT * FROM applications WHERE id=?", (app_id,)).fetchone()
    c.close()
    return dict(row)


def remove(app_id: int, user_id: int | None = None) -> bool:
    c = _conn()
    where, args = _scope(user_id)
    cur = c.execute(f"DELETE FROM applications WHERE id=? AND {where}", (app_id, *args))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def stats(user_id: int | None = None) -> dict:
    c = _conn()
    where, args = _scope(user_id)
    rows = c.execute(f"SELECT status, COUNT(*) n, AVG(score) s FROM applications WHERE {where} GROUP BY status", args).fetchall()
    total = c.execute(f"SELECT COUNT(*) FROM applications WHERE {where}", args).fetchone()[0]
    avg = c.execute(f"SELECT AVG(score) FROM applications WHERE {where} AND score>0", args).fetchone()[0] or 0
    c.close()
    by_status = {r["status"]: {"count": r["n"], "avg_score": round(r["s"] or 0, 1)} for r in rows}
    for s in ("saved", "applied", "interview", "offer", "rejected"):
        by_status.setdefault(s, {"count": 0, "avg_score": 0})
    return {"total": total, "avg_score": round(avg, 1), "by_status": by_status}
