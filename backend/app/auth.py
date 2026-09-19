"""Accounts: register/login with PBKDF2 + JWT. Profiles with public slugs."""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from .db import path as db_path

import jwt

DB = db_path()
SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGO = "HS256"
TTL = 7 * 86400
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE, name TEXT DEFAULT '', pw_hash TEXT DEFAULT '', salt TEXT DEFAULT '',
      headline TEXT DEFAULT '', location TEXT DEFAULT '', bio TEXT DEFAULT '',
      skills TEXT DEFAULT '', slug TEXT UNIQUE, created_at REAL)""")
    for col in ("sms_credits INTEGER DEFAULT 0", "referral_code TEXT"):
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col}")
        except Exception:
            pass
    for col in ("email_verified INTEGER DEFAULT 0", "avatar TEXT DEFAULT ''"):
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col}")
        except Exception:
            pass
    c.execute("""CREATE TABLE IF NOT EXISTS referrals(
      id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER,
      referred_email TEXT DEFAULT '', referred_id INTEGER,
      status TEXT DEFAULT 'pending', created_at REAL)""")
    return c


def _hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()


def _slugify(name: str, email: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or email.split("@")[0]).lower()).strip("-") or "user"
    return base[:30]


def _unique_slug(c: sqlite3.Connection, base: str) -> str:
    slug, i = base, 1
    while c.execute("SELECT id FROM users WHERE slug=?", (slug,)).fetchone():
        i += 1
        slug = f"{base}-{i}"
    return slug


def register(email: str, password: str, name: str = "") -> dict:
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        return {"error": "invalid email"}
    if len(password or "") < 6:
        return {"error": "password too short (min 6)"}
    c = _conn()
    if c.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        c.close()
        return {"error": "email already registered"}
    salt = secrets.token_hex(16)
    slug = _unique_slug(c, _slugify(name, email))
    cur = c.execute(
        "INSERT INTO users(email,name,pw_hash,salt,slug,created_at) VALUES(?,?,?,?,?,?)",
        (email, name or "", _hash(password, salt), salt, slug, time.time()))
    c.commit()
    row = c.execute("SELECT id,email,name,headline,location,bio,skills,slug FROM users WHERE id=?",
                    (cur.lastrowid,)).fetchone()
    c.close()
    u = dict(row)
    return {"user": _public(u), "token": _token(u["id"])}


def login(email: str, password: str) -> dict:
    c = _conn()
    row = c.execute("SELECT * FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
    c.close()
    if not row:
        return {"error": "invalid email or password"}
    if not row["pw_hash"]:
        return {"error": "this account uses Google login"}
    if _hash(password or "", row["salt"]) != row["pw_hash"]:
        return {"error": "invalid email or password"}
    u = {"id": row["id"], "email": row["email"], "name": row["name"],
         "headline": row["headline"], "location": row["location"],
         "bio": row["bio"], "skills": row["skills"], "slug": row["slug"]}
    return {"user": _public(u), "token": _token(u["id"])}


def _token(uid: int) -> str:
    return jwt.encode({"sub": str(uid), "exp": int(time.time()) + TTL}, SECRET, algorithm=ALGO)


def user_id_from_header(auth: str = "") -> int | None:
    try:
        scheme, _, token = (auth or "").partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        return int(jwt.decode(token, SECRET, algorithms=[ALGO])["sub"])
    except Exception:
        return None


def _public(u: dict) -> dict:
    skills = u.get("skills") or ""
    return {**u, "skills": [s.strip() for s in skills.split(",") if s.strip()] if isinstance(skills, str) else skills}


REF_BONUS = 3  # free SMS credits for both sides on a completed referral


def _code_for(c: sqlite3.Connection, uid: int, email: str) -> str:
    row = c.execute("SELECT referral_code FROM users WHERE id=?", (uid,)).fetchone()
    if row and row["referral_code"]:
        return row["referral_code"]
    base = re.sub(r"[^a-z0-9]+", "", email.split("@")[0].lower())[:10] or "user"
    code = f"{base}-{secrets.token_hex(2)}"
    while c.execute("SELECT id FROM users WHERE referral_code=?", (code,)).fetchone():
        code = f"{base}-{secrets.token_hex(2)}"
    c.execute("UPDATE users SET referral_code=? WHERE id=?", (code, uid))
    c.commit()
    return code


def referral_mine(uid: int) -> dict:
    c = _conn()
    me = c.execute("SELECT email, sms_credits FROM users WHERE id=?", (uid,)).fetchone()
    code = _code_for(c, uid, me["email"])
    rows = c.execute("SELECT referred_email, status, created_at FROM referrals WHERE referrer_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    c.close()
    return {"code": code, "sms_credits": me["sms_credits"] or 0,
            "invites": [dict(r) for r in rows], "bonus": REF_BONUS}


def _award(c: sqlite3.Connection, uid: int):
    c.execute("UPDATE users SET sms_credits=COALESCE(sms_credits,0)+? WHERE id=?", (REF_BONUS, uid))


def claim_referral(code: str, new_uid: int, new_email: str) -> bool:
    """Award both sides once. Returns True if a referrer was credited."""
    c = _conn()
    ref = c.execute("SELECT id FROM users WHERE referral_code=?", ((code or "").strip(),)).fetchone()
    if not ref or ref["id"] == new_uid:
        c.close()
        return False
    if c.execute("SELECT id FROM referrals WHERE referrer_id=? AND referred_id=?", (ref["id"], new_uid)).fetchone():
        c.close()
        return False
    c.execute("INSERT INTO referrals(referrer_id,referred_email,referred_id,status,created_at) VALUES(?,?,?,'joined',?)",
              (ref["id"], new_email, new_uid, time.time()))
    _award(c, ref["id"])
    _award(c, new_uid)
    c.commit()
    c.close()
    return True


def me(uid: int) -> dict | None:
    c = _conn()
    row = c.execute("SELECT id,email,name,headline,location,bio,skills,slug,created_at,email_verified,avatar FROM users WHERE id=?",
                    (uid,)).fetchone()
    c.close()
    return _public(dict(row)) if row else None


def update_profile(uid: int, patch: dict) -> dict | None:
    allowed = ("name", "headline", "location", "bio")
    fields = {k: patch[k] for k in allowed if k in patch}
    if "skills" in patch:
        s = patch["skills"]
        fields["skills"] = ", ".join(s) if isinstance(s, list) else str(s)
    if "avatar" in patch and isinstance(patch["avatar"], str) and len(patch["avatar"]) < 500000:
        if patch["avatar"].startswith("data:image/"):
            fields["avatar"] = patch["avatar"]
    if not fields:
        return me(uid)
    c = _conn()
    c.execute(f"UPDATE users SET {', '.join(f'{k}=?' for k in fields)} WHERE id=?",
              (*fields.values(), uid))
    c.commit()
    c.close()
    return me(uid)


def by_slug(slug: str) -> dict | None:
    c = _conn()
    row = c.execute("SELECT name,headline,location,bio,skills,slug,created_at,avatar FROM users WHERE slug=?",
                    (slug,)).fetchone()
    c.close()
    d = _public(dict(row)) if row else None
    if d and not d.get("avatar"):
        d.pop("avatar", None)
    return d


def email_of(uid: int | None) -> str:
    if not uid:
        return ""
    try:
        c = _conn()
        row = c.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()
        c.close()
        return row["email"] if row else ""
    except Exception:
        return ""


# ---- password reset (single-use tokens, emailed link) ----

def _reset_conn(c: sqlite3.Connection):
    c.execute("""CREATE TABLE IF NOT EXISTS password_resets(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, token_hash TEXT UNIQUE, expires REAL, used INTEGER DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS magic_links(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, token_hash TEXT UNIQUE, expires REAL, used INTEGER DEFAULT 0)""")


def issue_reset(email: str) -> dict:
    """Always returns ok (no account enumeration). Caller emails link if user exists.

    SECURITY: the plaintext token must never travel in an HTTP response — the
    returned dict is consumed only by trusted server-side email code. Callers
    that hand dicts back to clients MUST strip ``token``/``user_id`` first
    (main.py does this)."""
    c = _conn()
    _reset_conn(c)
    row = c.execute("SELECT id FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
    if not row or not c.execute("SELECT pw_hash FROM users WHERE id=?", (row["id"],)).fetchone()["pw_hash"]:
        # unknown email — or Google-only account (no password to reset)
        c.close()
        return {"ok": True, "sent": False}
    token = secrets.token_urlsafe(32)
    th = hashlib.sha256(token.encode()).hexdigest()
    c.execute("INSERT INTO password_resets(user_id,token_hash,expires) VALUES(?,?,?)",
              (row["id"], th, time.time() + 3600))
    c.commit()
    c.close()
    return {"ok": True, "sent": True, "token": token, "user_id": row["id"]}


def redeem_reset(token: str, password: str) -> dict:
    if len(password or "") < 6:
        return {"error": "password too short (min 6)"}
    th = hashlib.sha256((token or "").encode()).hexdigest()
    c = _conn()
    _reset_conn(c)
    row = c.execute("SELECT * FROM password_resets WHERE token_hash=?", (th,)).fetchone()
    if not row or row["used"] or row["expires"] < time.time():
        c.close()
        return {"error": "link invalid or expired"}
    salt = secrets.token_hex(16)
    c.execute("UPDATE users SET pw_hash=?, salt=? WHERE id=?", (_hash(password, salt), salt, row["user_id"]))
    c.execute("UPDATE password_resets SET used=1 WHERE id=?", (row["id"],))
    # Housekeeping: don't let dead tokens accumulate forever.
    c.execute("DELETE FROM password_resets WHERE expires < ?", (time.time() - 86400,))
    c.commit()
    c.close()
    return {"ok": True}


# ---- Google login (verify ID token, create-or-login by verified email) ----
async def google_login(id_token: str) -> dict:
    import httpx
    cid = os.getenv("GOOGLE_CLIENT_ID", "")
    if not cid:
        return {"error": "Google login not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as h:
            r = await h.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
            info = r.json() if r.status_code == 200 else {}
    except Exception:
        return {"error": "could not verify Google token"}
    if info.get("aud") != cid or info.get("email_verified") not in ("true", True):
        return {"error": "Google verification failed"}
    email = (info.get("email") or "").lower()
    name = info.get("name", "")
    c = _conn()
    row = c.execute("SELECT id,email,name,headline,location,bio,skills,slug FROM users WHERE email=?", (email,)).fetchone()
    if row:
        u = _public(dict(row))
        if not u["name"] and name:
            c.execute("UPDATE users SET name=? WHERE id=?", (name, row["id"]))
            u["name"] = name
        c.close()
        return {"user": u, "token": _token(row["id"])}
    slug = _unique_slug(c, _slugify(name, email))
    cur = c.execute("INSERT INTO users(email,name,pw_hash,salt,slug,created_at) VALUES(?,?, '', '', ?, ?)",
                    (email, name, slug, time.time()))
    c.commit()
    row = c.execute("SELECT id,email,name,headline,location,bio,skills,slug FROM users WHERE id=?",
                    (cur.lastrowid,)).fetchone()
    c.close()
    u = _public(dict(row))
    return {"user": u, "token": _token(u["id"])}


# ---- passwordless magic links ----

def issue_magic(email: str) -> dict:
    """Issue a passwordless login link. SECURITY: same rule as issue_reset —
    the plaintext token is for server-side email delivery only."""
    c = _conn()
    _reset_conn(c)
    row = c.execute("SELECT id FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
    if not row:
        c.close()
        return {"ok": True, "sent": False}
    token = secrets.token_urlsafe(32)
    th = hashlib.sha256(token.encode()).hexdigest()
    c.execute("INSERT INTO magic_links(user_id,token_hash,expires) VALUES(?,?,?)",
              (row["id"], th, time.time() + 900))
    c.commit()
    c.close()
    return {"ok": True, "sent": True, "token": token, "user_id": row["id"]}


def redeem_magic(token: str) -> dict:
    th = hashlib.sha256((token or "").encode()).hexdigest()
    c = _conn()
    _reset_conn(c)
    row = c.execute("SELECT * FROM magic_links WHERE token_hash=?", (th,)).fetchone()
    if not row or row["used"] or row["expires"] < time.time():
        c.close()
        return {"error": "link invalid or expired"}
    c.execute("UPDATE magic_links SET used=1 WHERE id=?", (row["id"],))
    c.execute("UPDATE users SET email_verified=1 WHERE id=?", (row["user_id"],))
    # Housekeeping: don't let dead tokens accumulate forever.
    c.execute("DELETE FROM magic_links WHERE expires < ?", (time.time() - 86400,))
    c.commit()
    u = c.execute("SELECT id,email,name,headline,location,bio,skills,slug FROM users WHERE id=?",
                  (row["user_id"],)).fetchone()
    c.close()
    if not u:
        return {"error": "account gone"}
    return {"user": _public(dict(u)), "token": _token(u["id"])}


def send_verify(uid: int) -> dict:
    """Email the user a verify-and-login link (reuses magic links)."""
    from . import alerts as _al
    c = _conn()
    row = c.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()
    c.close()
    if not row:
        return {"error": "not found"}
    res = issue_magic(row["email"])
    if res.get("sent"):
        import os as _os
        link = f"{_os.getenv('FRONTEND_URL', 'http://localhost:3000')}/verify?token={res['token']}"
        _al.send_email(row["email"], "Verify your AutomateJob email",
                       f"Click to verify (valid 15 minutes):\n{link}")
    return {"ok": True}


def delete_account(uid: int) -> dict:
    c = _conn()
    email = c.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()
    email = email["email"] if email else ""
    for t in ("resumes", "projects", "experience", "cvs", "push_subscriptions"):
        try:
            c.execute(f"DELETE FROM {t} WHERE user_id=?", (uid,))
        except Exception:
            pass
    try:
        c.execute("DELETE FROM applications WHERE user_id=?", (uid,))
    except Exception:
        pass
    try:
        c.execute("DELETE FROM saved_searches WHERE email=?", (email,))
    except Exception:
        pass
    try:
        c.execute("DELETE FROM company_members WHERE user_id=?", (uid,))
    except Exception:
        pass
    try:
        c.execute("DELETE FROM endorsements WHERE user_id=? OR by_email=?", (uid, email))
    except Exception:
        pass
    c.execute("DELETE FROM users WHERE id=?", (uid,))
    c.commit()
    c.close()
    return {"deleted": True}
