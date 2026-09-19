"""ATS lite — structured applications per posting, AI-scored at submit."""
from __future__ import annotations

import sqlite3
import time

from .board import _conn as board_conn
from .matcher import match_resume_to_job

STATUSES = ["new", "reviewing", "shortlisted", "interview", "hired", "rejected"]


def _init(c: sqlite3.Connection):
    c.execute("""CREATE TABLE IF NOT EXISTS applicants(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER, name TEXT DEFAULT '', email TEXT DEFAULT '', phone TEXT DEFAULT '',
      resume_text TEXT DEFAULT '', cover_note TEXT DEFAULT '',
      status TEXT DEFAULT 'new', notes TEXT DEFAULT '',
      score INTEGER DEFAULT 0, matched TEXT DEFAULT '',
      created_at REAL, updated_at REAL)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_app_job ON applicants(job_id, status)")
    for col in ("filename TEXT DEFAULT ''", "interview_at REAL DEFAULT 0"):
        try:
            c.execute(f"ALTER TABLE applicants ADD COLUMN {col}")
        except Exception:
            pass


def submit(job_id: int, name: str, email: str, phone: str,
           resume_text: str, cover_note: str = "", filename: str = "") -> dict:
    from . import board as job_board
    job = job_board.get(job_id)
    if not job:
        return {"error": "job not found"}
    blob = f"{job.get('title', '')} {' '.join(job.get('skills', []))} {job.get('description', '')}"
    try:
        m = match_resume_to_job(resume_text or "", blob)
        score, matched = m.score, ",".join(m.matched_skills[:8])
    except Exception:
        score, matched = 0, ""
    now = time.time()
    c = board_conn()
    _init(c)
    cur = c.execute(
        "INSERT INTO applicants(job_id,name,email,phone,resume_text,cover_note,status,notes,score,matched,created_at,updated_at,filename)"
        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (job_id, name or "", (email or "").strip().lower(), phone or "",
         (resume_text or "")[:15000], (cover_note or "")[:3000],
         "new", "", score, matched, now, now, (filename or "")[:120]))
    c.commit()
    row = c.execute("SELECT * FROM applicants WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    job_board.record_apply(job_id)
    return _row(row)


def _row(r: sqlite3.Row) -> dict:
    d = dict(r)
    d.pop("resume_text", None)  # full text via detail endpoint only
    d["matched_skills"] = [s for s in (d.pop("matched", "") or "").split(",") if s]
    return d


def list_for(job_id: int) -> list[dict]:
    c = board_conn()
    _init(c)
    rows = c.execute("SELECT * FROM applicants WHERE job_id=? ORDER BY score DESC, created_at DESC", (job_id,)).fetchall()
    c.close()
    return [_row(r) for r in rows]


def get(aid: int) -> dict | None:
    c = board_conn()
    _init(c)
    row = c.execute("SELECT * FROM applicants WHERE id=?", (aid,)).fetchone()
    c.close()
    if not row:
        return None
    d = dict(row)
    d["matched_skills"] = [s for s in (d.get("matched", "") or "").split(",") if s]
    return d


def update(aid: int, patch: dict) -> dict | None:
    allowed = ("status", "notes")
    fields = {k: patch[k] for k in allowed if k in patch}
    if "status" in fields and fields["status"] not in STATUSES:
        return {"error": "bad status"}
    if "interview_at" in patch:
        try:
            import datetime
            v = patch["interview_at"]
            fields["interview_at"] = datetime.datetime.fromisoformat(str(v)).timestamp() if v else 0
        except Exception:
            pass
    if not fields:
        return get(aid)
    fields["updated_at"] = time.time()
    c = board_conn()
    _init(c)
    if not c.execute("SELECT id FROM applicants WHERE id=?", (aid,)).fetchone():
        c.close()
        return None
    c.execute(f"UPDATE applicants SET {', '.join(f'{k}=?' for k in fields)} WHERE id=?",
              (*fields.values(), aid))
    c.commit()
    c.close()
    return get(aid)


def remove(aid: int) -> bool:
    c = board_conn()
    _init(c)
    cur = c.execute("DELETE FROM applicants WHERE id=?", (aid,))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def funnel(job_id: int) -> dict:
    c = board_conn()
    _init(c)
    rows = c.execute("SELECT status, COUNT(*) n, AVG(score) s FROM applicants WHERE job_id=? GROUP BY status",
                     (job_id,)).fetchall()
    total = c.execute("SELECT COUNT(*) FROM applicants WHERE job_id=?", (job_id,)).fetchone()[0]
    c.close()
    by = {r["status"]: {"count": r["n"], "avg_score": round(r["s"] or 0, 1)} for r in rows}
    for s in STATUSES:
        by.setdefault(s, {"count": 0, "avg_score": 0})
    return {"job_id": job_id, "total": total, "by_status": by}
