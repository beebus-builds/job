"""SMS-style alerts — gateway-backed, log-mode by default.

Real delivery (pick one):
  Sparrow SMS (Nepal):  SPARROW_TOKEN=...  [SPARROW_FROM=InfoSms]
  Generic webhook:      SMS_WEBHOOK_URL=https://...  [SMS_WEBHOOK_TOKEN=...]
Nothing set? Runs in log mode — matches still computed, no crash.
"""
from __future__ import annotations

import os
import re

import httpx


def normalize_phone(raw: str) -> str:
    p = re.sub(r"[\s\-()]", "", (raw or "").strip())
    p = re.sub(r"^\+?977-?", "", p)
    return p


def valid_phone(raw: str) -> bool:
    p = normalize_phone(raw)
    return bool(re.fullmatch(r"9\d{9}", p))


def send_sms(to: str, text: str) -> dict:
    to = normalize_phone(to)
    text = (text or "")[:300]
    token = os.getenv("SPARROW_TOKEN", "")
    hook = os.getenv("SMS_WEBHOOK_URL", "")
    if token:
        try:
            r = httpx.post("https://api.sparrowsms.com/v2/sms/", json={
                "token": token,
                "from": os.getenv("SPARROW_FROM", "InfoSms"),
                "to": to, "text": text,
            }, timeout=20)
            ok = r.status_code == 200 and "success" in r.text.lower()
            return {"sent": ok, "mode": "sparrow", "detail": r.text[:200]}
        except Exception as e:
            print("[sms/sparrow-failed]", str(e)[:200])
            return {"sent": False, "mode": "sparrow", "detail": str(e)[:200]}
    if hook:
        try:
            headers = {}
            wt = os.getenv("SMS_WEBHOOK_TOKEN", "")
            if wt:
                headers["Authorization"] = f"Bearer {wt}"
            r = httpx.post(hook, json={"to": to, "text": text}, headers=headers, timeout=20)
            return {"sent": 200 <= r.status_code < 300, "mode": "webhook", "detail": r.text[:200]}
        except Exception as e:
            print("[sms/webhook-failed]", str(e)[:200])
            return {"sent": False, "mode": "webhook", "detail": str(e)[:200]}
    print(("[sms/log-mode] TO=" + to + " TEXT=" + text).encode("ascii", "replace").decode())
    return {"sent": False, "mode": "log", "detail": "no SMS gateway configured — logged only"}
