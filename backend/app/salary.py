"""Salary insights aggregated from board postings. NPR/month normalized."""
from __future__ import annotations

import re

USD_NPR = 133.0

RANGE_RE = re.compile(
    r"(?P<cur>rs\.?|npr|\$)?\s*(?P<lo>[\d,]+)\s*(?P<lok>k)?\s*[–\-—to]+\s*"
    r"(?P<cur2>rs\.?|npr|\$)?\s*(?P<hi>[\d,]+)\s*(?P<hik>k)?",
    re.IGNORECASE)
SINGLE_RE = re.compile(r"(?P<cur>rs\.?|npr|\$)?\s*(?P<v>[\d,]+)\s*(?P<k>k)?", re.IGNORECASE)


def _num(s: str, k: str | None) -> float:
    v = float(s.replace(",", ""))
    return v * 1000 if k else v


def parse_salary(text: str) -> tuple[float, float] | None:
    """Return (low, high) in NPR/month, or None."""
    t = (text or "").lower()
    m = RANGE_RE.search(t)
    yearly = "year" in t or "annum" in t or "lpa" in t
    hourly = "hour" in t
    if "lpa" in t or "lakh" in t:
        # Indian-style LPA occurrences — treat number as lakh/yr
        nums = [float(x.replace(",", "")) for x in re.findall(r"[\d.]+", t)][:2]
        if not nums:
            return None
        lo = nums[0] * 100000 / 12
        hi = (nums[1] if len(nums) > 1 else nums[0]) * 100000 / 12
        return (lo, hi)
    if m:
        lo, hi = _num(m.group("lo"), m.group("lok")), _num(m.group("hi"), m.group("hik"))
        cur = (m.group("cur") or m.group("cur2") or "")
        is_usd = cur.startswith("$")
        if is_usd:
            lo, hi = lo * USD_NPR, hi * USD_NPR
        if yearly or (is_usd and not hourly and "month" not in t):
            # "$120k" with no period follows US convention: yearly
            lo, hi = lo / 12, hi / 12
        if hourly:
            lo, hi = lo * 160, hi * 160
        if lo > hi:
            lo, hi = hi, lo
        if hi > 5_000_000:  # garbage guard
            return None
        return (lo, hi)
    s = SINGLE_RE.search(t)
    if s and (s.group("cur") or s.group("k") or "," in s.group("v")):
        v = _num(s.group("v"), s.group("k"))
        if (s.group("cur") or "").startswith("$"):
            v *= USD_NPR
        if yearly:
            v /= 12
        if v > 5_000_000 or v < 1_000:
            return None
        return (v, v)
    return None


def _median(xs: list[float]) -> float:
    xs = sorted(xs)
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def insights(jobs: list[dict]) -> dict:
    samples = []
    for j in jobs:
        r = parse_salary(j.get("salary", ""))
        if r:
            samples.append({"title": j.get("title"), "company": j.get("company"),
                            "low": round(r[0]), "high": round(r[1])})
    if not samples:
        return {"count": 0, "samples": []}
    lows = [s["low"] for s in samples]
    highs = [s["high"] for s in samples]
    return {"count": len(samples), "currency": "NPR/month",
            "median_low": round(_median(lows)), "median_high": round(_median(highs)),
            "min": min(lows), "max": max(highs), "samples": samples[:20]}
