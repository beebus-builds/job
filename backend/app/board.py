"""Employer self-serve board — local postings that power the public /jobs pages."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from .db import path as db_path

DB = db_path()

COLS = ("id", "title", "company", "location", "work_type", "category",
        "salary", "description", "skills", "apply_url", "contact_email",
        "views", "applies", "created_at", "updated_at")


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS board_jobs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT DEFAULT 'Kathmandu',
      work_type TEXT DEFAULT 'Full-time', category TEXT DEFAULT 'Engineering',
      salary TEXT DEFAULT '', description TEXT DEFAULT '', skills TEXT DEFAULT '',
      apply_url TEXT DEFAULT '', contact_email TEXT DEFAULT '',
      views INTEGER DEFAULT 0, applies INTEGER DEFAULT 0,
      created_at REAL, updated_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS job_events(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER, kind TEXT, created_at REAL)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_events_job_time ON job_events(job_id, created_at)")
    try:
        c.execute("ALTER TABLE board_jobs ADD COLUMN user_id INTEGER")
    except Exception:
        pass
    return c


def owner_of(job_id: int) -> int | None:
    c = _conn()
    row = c.execute("SELECT user_id FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    c.close()
    if not row:
        return None
    try:
        return int(row["user_id"]) if row["user_id"] is not None else None
    except Exception:
        return None


def can_manage(job_id: int, user_id: int | None) -> bool:
    """Owned posts: only the owner or a company teammate (admins are checked
    separately by callers).

    SECURITY: ownerless posts (legacy/seeded) are NOT publicly manageable.
    They were previously editable/deletable by any anonymous visitor."""
    owner = owner_of(job_id)
    if owner is None:
        return False
    if user_id is not None and user_id == owner:
        return True
    return is_company_member(owner, user_id)


def _members_init(c):
    c.execute("""CREATE TABLE IF NOT EXISTS company_members(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER, user_id INTEGER,
      role TEXT DEFAULT 'manager', created_at REAL)""")
    c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_pair ON company_members(owner_id, user_id)")


def is_company_member(owner_id: int | None, user_id: int | None) -> bool:
    if not owner_id or not user_id:
        return False
    c = _conn()
    _members_init(c)
    row = c.execute("SELECT id FROM company_members WHERE owner_id=? AND user_id=?",
                    (owner_id, user_id)).fetchone()
    c.close()
    return bool(row)


def add_member(owner_id: int, email: str, role: str = "manager") -> dict:
    from . import auth as _auth
    c = _conn()
    _members_init(c)
    target = c.execute("SELECT id FROM users WHERE email=?", (email.strip().lower(),)).fetchone()
    if not target:
        c.close()
        return {"error": "no account with that email (they must register first)"}
    if target["id"] == owner_id:
        c.close()
        return {"error": "that's you"}
    try:
        c.execute("INSERT INTO company_members(owner_id,user_id,role,created_at) VALUES(?,?,?,?)",
                  (owner_id, target["id"], role if role in ("manager", "viewer") else "manager", time.time()))
        c.commit()
    except Exception:
        pass
    rows = c.execute("""SELECT m.user_id, m.role, u.email, u.name FROM company_members m
      JOIN users u ON u.id=m.user_id WHERE m.owner_id=?""", (owner_id,)).fetchall()
    c.close()
    return {"members": [dict(r) for r in rows]}


def list_members(owner_id: int) -> list[dict]:
    c = _conn()
    _members_init(c)
    rows = c.execute("""SELECT m.user_id, m.role, u.email, u.name FROM company_members m
      JOIN users u ON u.id=m.user_id WHERE m.owner_id=?""", (owner_id,)).fetchall()
    c.close()
    return [dict(r) for r in rows]


def drop_member(owner_id: int, user_id: int) -> bool:
    c = _conn()
    _members_init(c)
    cur = c.execute("DELETE FROM company_members WHERE owner_id=? AND user_id=?", (owner_id, user_id))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def record_event(job_id: int, kind: str):
    try:
        c = _conn()
        c.execute("INSERT INTO job_events(job_id, kind, created_at) VALUES(?,?,?)",
                  (job_id, kind, time.time()))
        c.commit()
        c.close()
    except Exception:
        pass


def _row(d: sqlite3.Row) -> dict:
    r = dict(d)
    r["skills"] = [s.strip() for s in (r.get("skills") or "").split(",") if s.strip()]
    now = time.time()
    try:
        r["featured"] = bool((r.get("featured_until") or 0) > now)
    except Exception:
        r["featured"] = False
    return r


def _migrate_board(c):
    for col in ("featured_until REAL DEFAULT 0", "deadline REAL DEFAULT 0",
                "destination TEXT DEFAULT ''"):
        try:
            c.execute(f"ALTER TABLE board_jobs ADD COLUMN {col}")
        except Exception:
            pass
    c.execute("""CREATE TABLE IF NOT EXISTS featured_requests(
      id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER, days INTEGER DEFAULT 7,
      status TEXT DEFAULT 'pending', created_at REAL)""")
    try:
        c.execute("ALTER TABLE featured_requests ADD COLUMN txn_uuid TEXT DEFAULT ''")
    except Exception:
        pass


def _live(j: dict) -> bool:
    try:
        dl = j.get("deadline") or 0
        return not dl or dl > time.time()
    except Exception:
        return True


def _parse_deadline(v) -> float:
    if not v:
        return 0
    try:
        if isinstance(v, (int, float)):
            return float(v)
        import datetime
        return datetime.datetime.fromisoformat(str(v)).timestamp()
    except Exception:
        return 0


def list_all(q: str = "", category: str = "", location: str = "", destination: str = "") -> list[dict]:
    c = _conn()
    _migrate_board(c)
    rows = c.execute("SELECT * FROM board_jobs ORDER BY created_at DESC LIMIT 200").fetchall()
    c.close()
    out = [_row(r) for r in rows]
    out = [j for j in out if _live(j)]
    if category:
        out = [j for j in out if j.get("category", "").lower() == category.lower()]
    if location:
        ql = location.lower()
        out = [j for j in out if ql in (j.get("location", "") or "").lower()]
    if q:
        ql = q.lower()
        out = [j for j in out if ql in (j.get("title", "") + j.get("company", "") + j.get("description", "") + " ".join(j.get("skills", []))).lower()]
    if destination:
        out = [j for j in out if (j.get("destination", "") or "").lower() == destination.lower()]
    out.sort(key=lambda j: (not j.get("featured"), -(j.get("created_at") or 0)))
    return out


def get(job_id: int, bump_view: bool = False) -> dict | None:
    c = _conn()
    row = c.execute("SELECT * FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    if row and bump_view:
        c.execute("UPDATE board_jobs SET views=views+1 WHERE id=?", (job_id,))
        c.commit()
        row = c.execute("SELECT * FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    c.close()
    out = _row(row) if row else None
    if out and bump_view:
        record_event(job_id, "view")
    return out


def create(item: dict) -> dict:
    now = time.time()
    skills = item.get("skills", "")
    if isinstance(skills, list):
        skills = ", ".join(skills)
    uid = item.get("user_id")
    try:
        uid = int(uid) if uid is not None else None
    except Exception:
        uid = None
    c = _conn()
    _migrate_board(c)
    cur = c.execute(
        "INSERT INTO board_jobs(title,company,location,work_type,category,salary,description,skills,apply_url,contact_email,views,applies,created_at,updated_at,user_id,deadline,destination)"
        " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (item.get("title", "Untitled"), item.get("company", "Unknown"),
         item.get("location", "Kathmandu"), item.get("work_type", "Full-time"),
         item.get("category", "Engineering"), item.get("salary", ""),
         item.get("description", ""), skills,
         item.get("apply_url", ""), item.get("contact_email", ""),
         0, 0, now, now, uid, _parse_deadline(item.get("deadline")),
         item.get("destination", "") or ""))
    c.commit()
    row = c.execute("SELECT * FROM board_jobs WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    return _row(row)


def update(job_id: int, patch: dict) -> dict | None:
    c = _conn()
    if not c.execute("SELECT id FROM board_jobs WHERE id=?", (job_id,)).fetchone():
        c.close()
        return None
    allowed = ("title", "company", "location", "work_type", "category", "salary",
               "description", "apply_url", "contact_email", "destination")
    fields: dict = {k: patch[k] for k in allowed if k in patch}
    if "skills" in patch:
        s = patch["skills"]
        fields["skills"] = ", ".join(s) if isinstance(s, list) else s
    if "deadline" in patch:
        fields["deadline"] = _parse_deadline(patch["deadline"])
    fields["updated_at"] = time.time()
    c.execute(f"UPDATE board_jobs SET {', '.join(f'{k}=?' for k in fields)} WHERE id=?",
              (*fields.values(), job_id))
    c.commit()
    row = c.execute("SELECT * FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    c.close()
    return _row(row)


def remove(job_id: int) -> bool:
    c = _conn()
    cur = c.execute("DELETE FROM board_jobs WHERE id=?", (job_id,))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def record_apply(job_id: int) -> dict | None:
    c = _conn()
    if not c.execute("SELECT id FROM board_jobs WHERE id=?", (job_id,)).fetchone():
        c.close()
        return None
    c.execute("UPDATE board_jobs SET applies=applies+1 WHERE id=?", (job_id,))
    c.commit()
    row = c.execute("SELECT * FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    c.close()
    record_event(job_id, "apply")
    return _row(row)


CATEGORIES = ["Engineering", "Design", "Marketing", "Finance", "HR", "Sales", "Support", "Internship", "Other"]


def analytics(job_id: int, days: int = 30) -> dict:
    """Daily views/applies series + totals + apply conversion rate."""
    import datetime
    days = max(1, min(90, days or 30))
    today = datetime.date.today()
    labels = [(today - datetime.timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    series = [{"date": d, "views": 0, "applies": 0} for d in labels]
    idx = {d: s for d, s in zip(labels, series)}
    start_ts = time.mktime(today.timetuple()) - (days - 1) * 86400
    c = _conn()
    job = c.execute("SELECT * FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    if not job:
        c.close()
        return {"error": "not found"}
    rows = c.execute(
        "SELECT kind, created_at FROM job_events WHERE job_id=? AND created_at>=?",
        (job_id, start_ts)).fetchall()
    c.close()
    for r in rows:
        d = datetime.date.fromtimestamp(r["created_at"]).isoformat()
        if d in idx and r["kind"] in ("views", "applies", "view", "apply"):
            k = "views" if r["kind"].startswith("view") else "applies"
            idx[d][k] += 1
    views = sum(s["views"] for s in series)
    applies = sum(s["applies"] for s in series)
    totals = {"views": job["views"], "applies": job["applies"]}
    conv = round(100.0 * totals["applies"] / max(1, totals["views"]), 1)
    return {"job_id": job_id, "title": job["title"], "company": job["company"],
            "days": days, "series": series,
            "period": {"views": views, "applies": applies},
            "totals": totals, "apply_rate_pct": conv}


def summary() -> dict:
    c = _conn()
    rows = c.execute("SELECT id, title, company, views, applies FROM board_jobs ORDER BY views DESC").fetchall()
    c.close()
    jobs = [dict(r) for r in rows]
    for j in jobs:
        j["apply_rate_pct"] = round(100.0 * (j["applies"] or 0) / max(1, j["views"] or 0), 1)
    return {"count": len(jobs),
            "total_views": sum(j["views"] or 0 for j in jobs),
            "total_applies": sum(j["applies"] or 0 for j in jobs),
            "jobs": jobs}


REPORT_REASONS = ["spam", "scam", "expired", "wrong-info", "other"]


def _rep_init(c):
    c.execute("""CREATE TABLE IF NOT EXISTS reports(
      id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER,
      job_title TEXT DEFAULT '', job_company TEXT DEFAULT '',
      reason TEXT DEFAULT 'other', details TEXT DEFAULT '', email TEXT DEFAULT '',
      created_at REAL)""")


def report_job(job_id: int, reason: str, email: str = "", details: str = "") -> dict:
    c = _conn()
    _rep_init(c)
    job = c.execute("SELECT title, company FROM board_jobs WHERE id=?", (job_id,)).fetchone()
    if not job:
        c.close()
        return {"error": "not found"}
    if reason not in REPORT_REASONS:
        reason = "other"
    cur = c.execute(
        "INSERT INTO reports(job_id,job_title,job_company,reason,details,email,created_at)"
        " VALUES(?,?,?,?,?,?,?)",
        (job_id, job["title"], job["company"], reason, (details or "")[:1000],
         (email or "").strip().lower(), time.time()))
    c.commit()
    c.close()
    return {"ok": True, "id": cur.lastrowid}


def list_reports() -> list[dict]:
    c = _conn()
    _rep_init(c)
    rows = c.execute("SELECT * FROM reports ORDER BY created_at DESC LIMIT 200").fetchall()
    c.close()
    return [dict(r) for r in rows]


def dismiss_report(rid: int) -> bool:
    c = _conn()
    _rep_init(c)
    cur = c.execute("DELETE FROM reports WHERE id=?", (rid,))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def my_applications(email: str) -> list[dict]:
    """Seeker view: every structured application sent from this email + job info."""
    from . import ats as _ats
    c = _conn()
    _ats._init(c)
    rows = c.execute("""SELECT a.id,a.job_id,a.name,a.status,a.score,a.created_at,
      j.title AS job_title, j.company AS job_company, j.location AS job_location
      FROM applicants a LEFT JOIN board_jobs j ON j.id=a.job_id
      WHERE a.email=? ORDER BY a.created_at DESC""", ((email or "").strip().lower(),)).fetchall()
    c.close()
    return [dict(r) for r in rows]


def request_feature(job_id: int, days: int = 7) -> dict:
    c = _conn()
    _migrate_board(c)
    if not c.execute("SELECT id FROM board_jobs WHERE id=?", (job_id,)).fetchone():
        c.close()
        return {"error": "not found"}
    days = max(1, min(90, int(days or 7)))
    row = c.execute("SELECT * FROM featured_requests WHERE job_id=? AND status='pending'", (job_id,)).fetchone()
    if row:
        c.close()
        return dict(row)
    cur = c.execute("INSERT INTO featured_requests(job_id,days,status,created_at) VALUES(?,?,?,?)",
                    (job_id, days, "pending", time.time()))
    c.commit()
    row = c.execute("SELECT * FROM featured_requests WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    return dict(row)


def list_feature_requests() -> list[dict]:
    c = _conn()
    _migrate_board(c)
    rows = c.execute("""SELECT f.*, j.title AS job_title, j.company AS job_company
      FROM featured_requests f LEFT JOIN board_jobs j ON j.id=f.job_id
      ORDER BY f.created_at DESC LIMIT 100""").fetchall()
    c.close()
    return [dict(r) for r in rows]


def approve_feature(rid: int, approve: bool = True) -> dict | None:
    c = _conn()
    _migrate_board(c)
    row = c.execute("SELECT * FROM featured_requests WHERE id=?", (rid,)).fetchone()
    if not row:
        c.close()
        return None
    if approve:
        c.execute("UPDATE board_jobs SET featured_until=? WHERE id=?",
                  (time.time() + row["days"] * 86400, row["job_id"]))
    c.execute("UPDATE featured_requests SET status=? WHERE id=?",
              ("approved" if approve else "rejected", rid))
    c.commit()
    out = c.execute("SELECT * FROM featured_requests WHERE id=?", (rid,)).fetchone()
    c.close()
    return dict(out)


def set_feature_txn(rid: int, txn: str):
    c = _conn()
    _migrate_board(c)
    c.execute("UPDATE featured_requests SET txn_uuid=? WHERE id=?", (txn, rid))
    c.commit()
    c.close()


def find_feature_by_txn(txn: str) -> dict | None:
    c = _conn()
    _migrate_board(c)
    row = c.execute("SELECT * FROM featured_requests WHERE txn_uuid=?", (txn,)).fetchone()
    c.close()
    return dict(row) if row else None
