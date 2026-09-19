"""Engagement: web-push subscriptions, profile views, endorsements, leaderboard."""
from __future__ import annotations

import json
import os
import sqlite3
import time


def _conn():
    from .db import path as db_path
    c = sqlite3.connect(db_path())
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS push_subscriptions(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      endpoint TEXT UNIQUE, keys TEXT DEFAULT '{}', created_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS endorsements(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      skill TEXT DEFAULT '', by_email TEXT DEFAULT '', created_at REAL)""")
    c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_endorse_once ON endorsements(user_id, skill, by_email)")
    try:
        c.execute("ALTER TABLE users ADD COLUMN profile_views INTEGER DEFAULT 0")
    except Exception:
        pass
    return c


def subscribe(uid: int, endpoint: str, keys: dict) -> dict:
    c = _conn()
    try:
        c.execute("INSERT INTO push_subscriptions(user_id,endpoint,keys,created_at) VALUES(?,?,?,?)",
                  (uid, endpoint, json.dumps(keys or {})[:2000], time.time()))
        c.commit()
    except Exception:
        pass
    n = c.execute("SELECT COUNT(*) FROM push_subscriptions WHERE user_id=?", (uid,)).fetchone()[0]
    c.close()
    return {"ok": True, "devices": n}


def vapid_key() -> str:
    return os.getenv("VAPID_PUBLIC_KEY", "")


def push_to(uid: int, title: str, body: str, url: str = "/") -> dict:
    """Best-effort push. Log-mode when VAPID_PRIVATE_KEY unset."""
    c = _conn()
    subs = c.execute("SELECT endpoint, keys FROM push_subscriptions WHERE user_id=?", (uid,)).fetchall()
    c.close()
    if not subs:
        return {"sent": 0, "detail": "no devices"}
    priv = os.getenv("VAPID_PRIVATE_KEY", "")
    if not priv:
        print(f"[push/log-mode] uid={uid} n={len(subs)} TITLE={title}".encode("ascii", "replace").decode())
        return {"sent": 0, "mode": "log", "detail": "VAPID_PRIVATE_KEY unset — logged only"}
    try:
        from pywebpush import webpush
        ok = 0
        for s in subs:
            try:
                webpush(json.loads(s["keys"] and s["keys"] or "{}") | {"endpoint": s["endpoint"]},
                        json.dumps({"title": title, "body": body, "url": url}),
                        vapid_private_key=priv,
                        vapid_claims={"sub": os.getenv("VAPID_SUBJECT", "mailto:admin@automatejob.local")})
                ok += 1
            except Exception:
                pass
        return {"sent": ok, "mode": "push"}
    except ImportError:
        return {"sent": 0, "mode": "log", "detail": "pywebpush not installed"}


def bump_views(slug: str):
    try:
        from . import auth as _auth
        c = _conn()
        c.execute("UPDATE users SET profile_views=COALESCE(profile_views,0)+1 WHERE slug=?", (slug,))
        c.commit()
        c.close()
    except Exception:
        pass


def endorse(uid: int, skill: str, by_email: str) -> dict:
    skill = (skill or "").strip()[:40]
    if not skill:
        return {"error": "empty skill"}
    c = _conn()
    try:
        c.execute("INSERT INTO endorsements(user_id,skill,by_email,created_at) VALUES(?,?,?,?)",
                  (uid, skill, (by_email or "").strip().lower()[:120], time.time()))
        c.commit()
    except Exception:
        pass
    rows = c.execute("SELECT skill, COUNT(*) n FROM endorsements WHERE user_id=? GROUP BY skill", (uid,)).fetchall()
    c.close()
    return {"counts": {r["skill"]: r["n"] for r in rows}}


def endorse_counts(uid: int) -> dict:
    c = _conn()
    rows = c.execute("SELECT skill, COUNT(*) n FROM endorsements WHERE user_id=? GROUP BY skill", (uid,)).fetchall()
    c.close()
    return {r["skill"]: r["n"] for r in rows}


def leaderboard() -> list[dict]:
    c = _conn()
    rows = c.execute("""SELECT u.name, u.slug, COUNT(r.id) n FROM referrals r
      JOIN users u ON u.id=r.referrer_id
      GROUP BY r.referrer_id ORDER BY n DESC LIMIT 10""").fetchall()
    c.close()
    return [{"name": r["name"], "slug": r["slug"], "invites": r["n"]} for r in rows]
