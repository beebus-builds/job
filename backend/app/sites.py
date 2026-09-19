"""Company sites + seeker portfolios + CVs — websites within the platform."""
from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path
from .db import path as db_path

DB = db_path()

THEMES = ["indigo", "emerald", "sky", "amber", "rose", "violet"]


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS company_sites(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, slug TEXT UNIQUE,
      company TEXT DEFAULT '', tagline TEXT DEFAULT '', theme TEXT DEFAULT 'indigo',
      emoji TEXT DEFAULT '', about TEXT DEFAULT '', location TEXT DEFAULT '',
      website TEXT DEFAULT '', benefits TEXT DEFAULT '',
      created_at REAL, updated_at REAL)""")
    for col in ("verified INTEGER DEFAULT 0", "logo TEXT DEFAULT ''"):
        try:
            c.execute(f"ALTER TABLE company_sites ADD COLUMN {col}")
        except Exception:
            pass
    c.execute("""CREATE TABLE IF NOT EXISTS projects(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      title TEXT DEFAULT '', description TEXT DEFAULT '', link TEXT DEFAULT '',
      tags TEXT DEFAULT '', sort INTEGER DEFAULT 0, created_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS experience(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      role TEXT DEFAULT '', org TEXT DEFAULT '', period TEXT DEFAULT '',
      description TEXT DEFAULT '', sort INTEGER DEFAULT 0, created_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS cvs(
      user_id INTEGER PRIMARY KEY, name TEXT DEFAULT '', email TEXT DEFAULT '',
      phone TEXT DEFAULT '', location TEXT DEFAULT '', summary TEXT DEFAULT '',
      experience TEXT DEFAULT '[]', education TEXT DEFAULT '[]', skills TEXT DEFAULT '',
      template TEXT DEFAULT 'modern', updated_at REAL)""")
    return c


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:40] or "site"


# ---------- company sites ----------

def get_company(uid: int) -> dict | None:
    c = _conn()
    row = c.execute("SELECT * FROM company_sites WHERE user_id=?", (uid,)).fetchone()
    c.close()
    return dict(row) if row else None


def upsert_company(uid: int, data: dict) -> dict:
    slug = _slugify(data.get("slug") or data.get("company") or "")
    theme = data.get("theme") if data.get("theme") in THEMES else "indigo"
    now = time.time()
    c = _conn()
    logo = data.get("logo", "")
    if logo and (not isinstance(logo, str) or not logo.startswith("data:image/") or len(logo) > 500000):
        logo = ""
    clash = c.execute("SELECT user_id FROM company_sites WHERE slug=?", (slug,)).fetchone()
    if clash and clash["user_id"] != uid:
        slug = f"{slug}-{uid}"
    if c.execute("SELECT id FROM company_sites WHERE user_id=?", (uid,)).fetchone():
        c.execute("""UPDATE company_sites SET slug=?,company=?,tagline=?,theme=?,emoji=?,logo=?,
          about=?,location=?,website=?,benefits=?,updated_at=? WHERE user_id=?""",
                  (slug, data.get("company", ""), data.get("tagline", ""), theme,
                   data.get("emoji", "")[:4], logo, data.get("about", ""), data.get("location", ""),
                   data.get("website", ""), data.get("benefits", ""), now, uid))
    else:
        c.execute("""INSERT INTO company_sites(user_id,slug,company,tagline,theme,emoji,logo,
          about,location,website,benefits,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (uid, slug, data.get("company", ""), data.get("tagline", ""), theme,
                   data.get("emoji", "")[:4], logo, data.get("about", ""), data.get("location", ""),
                   data.get("website", ""), data.get("benefits", ""), now, now))
    c.commit()
    row = c.execute("SELECT * FROM company_sites WHERE user_id=?", (uid,)).fetchone()
    c.close()
    return dict(row)


def company_public(slug: str) -> dict | None:
    c = _conn()
    site = c.execute("SELECT * FROM company_sites WHERE slug=?", (slug,)).fetchone()
    if not site:
        c.close()
        return None
    site = dict(site)
    jobs = c.execute("SELECT id,title,location,work_type,category,salary,deadline FROM board_jobs WHERE user_id=? ORDER BY created_at DESC",
                     (site["user_id"],)).fetchall()
    c.close()
    now = time.time()
    site["jobs"] = [dict(j) for j in jobs if not (j["deadline"] or 0) or j["deadline"] > now]
    return site


def company_list() -> list[dict]:
    c = _conn()
    rows = c.execute("""SELECT s.slug,s.company,s.tagline,s.theme,s.emoji,s.location,s.verified,
      (SELECT COUNT(*) FROM board_jobs j WHERE j.user_id=s.user_id) AS openings
      FROM company_sites s ORDER BY s.updated_at DESC""").fetchall()
    c.close()
    return [dict(r) for r in rows]


# ---------- portfolio: projects + experience ----------

def _items(table: str, uid: int) -> list[dict]:
    c = _conn()
    rows = c.execute(f"SELECT * FROM {table} WHERE user_id=? ORDER BY sort, id", (uid,)).fetchall()
    c.close()
    out = []
    for r in rows:
        d = dict(r)
        if "tags" in d:
            d["tags"] = [t.strip() for t in (d["tags"] or "").split(",") if t.strip()]
        out.append(d)
    return out


def _add(table: str, uid: int, data: dict, fields: list[str]) -> dict:
    vals = [data.get(k, "") for k in fields]
    if "tags" in fields:
        i = fields.index("tags")
        v = vals[i]
        vals[i] = ", ".join(v) if isinstance(v, list) else str(v)
    c = _conn()
    cols = ",".join(fields)
    c.execute(f"INSERT INTO {table}(user_id,{cols},sort,created_at) VALUES(?{',?' * len(fields)},?,?)",
              (uid, *vals, int(data.get("sort", 0) or 0), time.time()))
    c.commit()
    cur = c.execute("SELECT * FROM {} WHERE user_id=? ORDER BY id DESC LIMIT 1".format(table), (uid,)).fetchone()
    c.close()
    return dict(cur)


def _patch(table: str, uid: int, iid: int, patch: dict, fields: list[str]) -> dict | None:
    vals = {k: patch[k] for k in fields if k in patch}
    if "tags" in vals and isinstance(vals["tags"], list):
        vals["tags"] = ", ".join(vals["tags"])
    if "sort" in patch:
        vals["sort"] = int(patch["sort"] or 0)
    c = _conn()
    if not c.execute(f"SELECT id FROM {table} WHERE id=? AND user_id=?", (iid, uid)).fetchone():
        c.close()
        return None
    if vals:
        c.execute(f"UPDATE {table} SET {', '.join(f'{k}=?' for k in vals)} WHERE id=?",
                  (*vals.values(), iid))
        c.commit()
    row = c.execute(f"SELECT * FROM {table} WHERE id=?", (iid,)).fetchone()
    c.close()
    return dict(row) if row else None


def _drop(table: str, uid: int, iid: int) -> bool:
    c = _conn()
    cur = c.execute(f"DELETE FROM {table} WHERE id=? AND user_id=?", (iid, uid))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


PROJ_FIELDS = ["title", "description", "link", "tags"]
EXP_FIELDS = ["role", "org", "period", "description"]


def portfolio_bundle(slug: str) -> dict | None:
    from . import auth as accounts
    from . import engage as _eng
    prof = accounts.by_slug(slug)
    if not prof:
        return None
    c = _conn()
    uid = c.execute("SELECT id FROM users WHERE slug=?", (slug,)).fetchone()["id"]
    c.close()
    _eng.bump_views(slug)
    c = _conn()
    views = 0
    try:
        views = c.execute("SELECT profile_views FROM users WHERE id=?", (uid,)).fetchone()[0] or 0
    except Exception:
        pass
    c.close()
    return {"profile": prof,
            "projects": _items("projects", uid),
            "experience": _items("experience", uid),
            "endorsements": _eng.endorse_counts(uid),
            "views": views}


# ---------- CV ----------

def get_cv(uid: int) -> dict:
    c = _conn()
    row = c.execute("SELECT * FROM cvs WHERE user_id=?", (uid,)).fetchone()
    c.close()
    if not row:
        return {"user_id": uid, "template": "modern", "experience": [], "education": [],
                "skills": [], "name": "", "email": "", "phone": "", "location": "", "summary": ""}
    d = dict(row)
    import json
    for k in ("experience", "education"):
        try:
            d[k] = json.loads(d[k] or "[]")
        except Exception:
            d[k] = []
    d["skills"] = [s.strip() for s in (d.get("skills") or "").split(",") if s.strip()]
    return d


def save_cv(uid: int, data: dict) -> dict:
    import json
    exp = data.get("experience", [])
    edu = data.get("education", [])
    skills = data.get("skills", [])
    if isinstance(skills, list):
        skills = ", ".join(skills)
    tmpl = data.get("template") if data.get("template") in ("modern", "classic", "minimal") else "modern"
    c = _conn()
    c.execute("""INSERT INTO cvs(user_id,name,email,phone,location,summary,experience,education,skills,template,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
      name=excluded.name,email=excluded.email,phone=excluded.phone,location=excluded.location,
      summary=excluded.summary,experience=excluded.experience,education=excluded.education,
      skills=excluded.skills,template=excluded.template,updated_at=excluded.updated_at""",
                (uid, data.get("name", ""), data.get("email", ""), data.get("phone", ""),
                 data.get("location", ""), data.get("summary", ""),
                 json.dumps(exp)[:20000], json.dumps(edu)[:10000], str(skills),
                 tmpl, time.time()))
    c.commit()
    c.close()
    return get_cv(uid)
