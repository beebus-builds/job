"""Saved-search job alerts — seekers subscribe, we match + notify.

Email: uses SMTP if env provides it (SMTP_HOST/PORT/USER/PASS/FROM),
otherwise runs in log mode (matches computed, logged, returned — no crash).
Run delivery with:  POST /api/alerts/check
Cron it (e.g. every hour) to beat MeroJob's alert game.
"""
from __future__ import annotations

import os
import re
import smtplib
import sqlite3
import time
from email.mime.text import MIMEText
from pathlib import Path
from .db import path as db_path

DB = db_path()
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS saved_searches(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT, query TEXT DEFAULT '', category TEXT DEFAULT '',
      location TEXT DEFAULT '', min_score INTEGER DEFAULT 0,
      resume_text TEXT DEFAULT '', last_sent REAL DEFAULT 0,
      created_at REAL)""")
    try:
        c.execute("ALTER TABLE saved_searches ADD COLUMN lang TEXT DEFAULT 'en'")
    except Exception:
        pass
    for col in ("phone TEXT DEFAULT ''", "channel TEXT DEFAULT 'email'"):
        try:
            c.execute(f"ALTER TABLE saved_searches ADD COLUMN {col}")
        except Exception:
            pass
    return c


def valid_email(e: str) -> bool:
    return bool(EMAIL_RE.match((e or "").strip()))


def create(email: str, query: str = "", category: str = "", location: str = "",
           min_score: int = 0, resume_text: str = "", lang: str = "en",
           phone: str = "", channel: str = "email") -> dict:
    now = time.time()
    lang = lang if lang in ("en", "ne") else "en"
    channel = channel if channel in ("email", "sms", "both") else "email"
    c = _conn()
    cur = c.execute(
        "INSERT INTO saved_searches(email,query,category,location,min_score,resume_text,lang,phone,channel,last_sent,created_at)"
        " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (email.strip().lower(), query or "", category or "", location or "",
         min_score or 0, (resume_text or "")[:8000], lang, phone or "", channel, 0, now))
    c.commit()
    row = c.execute("SELECT * FROM saved_searches WHERE id=?", (cur.lastrowid,)).fetchone()
    c.close()
    return dict(row)


def list_for(email: str) -> list[dict]:
    c = _conn()
    rows = c.execute("SELECT * FROM saved_searches WHERE email=? ORDER BY created_at DESC",
                     (email.strip().lower(),)).fetchall()
    c.close()
    return [dict(r) for r in rows]


def remove(alert_id: int) -> bool:
    c = _conn()
    cur = c.execute("DELETE FROM saved_searches WHERE id=?", (alert_id,))
    c.commit()
    ok = cur.rowcount > 0
    c.close()
    return ok


def all_alerts() -> list[dict]:
    c = _conn()
    rows = c.execute("SELECT * FROM saved_searches").fetchall()
    c.close()
    return [dict(r) for r in rows]


def touch_sent(alert_id: int):
    c = _conn()
    c.execute("UPDATE saved_searches SET last_sent=? WHERE id=?", (time.time(), alert_id))
    c.commit()
    c.close()


def smtp_config() -> dict:
    """Resolve SMTP settings. Gmail is the default path: just set a Gmail
    address as SMTP_USER (+ an App Password as SMTP_PASS) and the host,
    port and From fill themselves in."""
    user = os.getenv("SMTP_USER", "").strip()
    host = os.getenv("SMTP_HOST", "").strip()
    is_gmail = "gmail.com" in user.lower() or "googlemail.com" in user.lower()
    if not host and is_gmail:
        host = "smtp.gmail.com"
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": user,
        "pass": os.getenv("SMTP_PASS", ""),
        "from": os.getenv("SMTP_FROM", user or "alerts@automatejob.local"),
        "provider": "gmail" if (is_gmail or host == "smtp.gmail.com") else ("custom" if host else "none"),
    }


def send_email(to: str, subject: str, body: str) -> dict:
    cfg = smtp_config()
    if not cfg["host"]:
        print(f"[alerts/log-mode] TO={to} SUBJECT={subject}".encode("ascii", "replace").decode())
        return {"sent": False, "mode": "log", "detail": "SMTP not configured — set SMTP_USER (+ SMTP_PASS) to send via Gmail"}
    msg = MIMEText(body, _charset="utf-8")
    try:
        from email.header import Header
        msg["Subject"] = Header(subject, "utf-8")
    except Exception:
        msg["Subject"] = subject.encode("ascii", "replace").decode()
    msg["From"] = cfg["from"]
    msg["To"] = to
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=20) as s:
            s.starttls()
            if cfg["user"]:
                try:
                    s.login(cfg["user"], cfg["pass"])
                except smtplib.SMTPAuthenticationError:
                    return {"sent": False, "mode": "smtp",
                            "detail": "Gmail rejected login — use an App Password (Google Account → Security → 2-Step Verification → App passwords), not your normal password"}
            s.sendmail(cfg["from"], [to], msg.as_string())
        return {"sent": True, "mode": "smtp"}
    except Exception as e:
        print(f"[alerts/smtp-failed] {e}")
        return {"sent": False, "mode": "smtp", "detail": str(e)[:300]}
