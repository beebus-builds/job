"""eSewa ePay v2 billing for featured posts. Works in test + live mode.

Setup: ESEWA_MERCHANT, ESEWA_SECRET, ESEWA_MODE=test|live, FEATURE_PRICE_NPR.
Without creds every endpoint says so honestly — nothing half-charges.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

ENDPOINTS = {
    "test": "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    "live": "https://epay.esewa.com.np/api/epay/main/v2/form",
}


def cfg() -> dict:
    return {
        "merchant": os.getenv("ESEWA_MERCHANT", ""),
        "secret": os.getenv("ESEWA_SECRET", ""),
        "mode": os.getenv("ESEWA_MODE", "test"),
        "price": int(os.getenv("FEATURE_PRICE_NPR", "499")),
    }


def enabled() -> bool:
    c = cfg()
    return bool(c["merchant"] and c["secret"])


def sign(secret: str, fields: dict, order: list[str]) -> str:
    msg = ",".join(f"{k}={fields[k]}" for k in order)
    return base64.b64encode(hmac.new(secret.encode(), msg.encode(), hashlib.sha256).digest()).decode()


def initiate_fields(job_id: int, req_id: int, days: int) -> dict:
    c = cfg()
    total = c["price"]
    txn = f"feat-{req_id}-{int(time.time())}"
    fields = {
        "amount": str(total), "tax_amount": "0", "total_amount": str(total),
        "transaction_uuid": txn, "product_code": c["merchant"],
        "product_service_charge": "0", "product_delivery_charge": "0",
        "success_url": os.getenv("FRONTEND_URL", "http://localhost:3000") + "/billing/done",
        "failure_url": os.getenv("FRONTEND_URL", "http://localhost:3000") + "/billing/fail",
        "signed_field_names": "total_amount,transaction_uuid,product_code",
    }
    fields["signature"] = sign(c["secret"], fields, ["total_amount", "transaction_uuid", "product_code"])
    return {"endpoint": ENDPOINTS.get(c["mode"], ENDPOINTS["test"]), "fields": fields,
            "txn_uuid": txn, "amount": total}


def expected_amount(days: int) -> int:
    """Price for a featuring request: FEATURE_PRICE_NPR per 7-day block.
    SECURITY: used to verify the eSewa callback amount — never trust the
    callback's own total without comparing it to this."""
    blocks = max(1, -(-int(days or 7) // 7))  # ceil division
    return cfg()["price"] * blocks


def verify_response(data_b64: str) -> dict:
    """Decode eSewa success callback, verify signature. Returns payload or error."""
    c = cfg()
    try:
        payload = json.loads(base64.b64decode(data_b64).decode())
    except Exception:
        return {"error": "bad callback data"}
    signed = (payload.get("signed_field_names") or "").split(",")
    expect = sign(c["secret"], payload, signed)
    import hmac as _hm
    if not _hm.compare_digest(expect, payload.get("signature", "")):
        return {"error": "signature mismatch"}
    if payload.get("status") != "COMPLETE":
        return {"error": f"payment {payload.get('status')}"}
    return {"ok": True, "txn": payload.get("transaction_uuid", ""), "amount": payload.get("total_amount")}
