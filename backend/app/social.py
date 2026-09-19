"""Weekly social pack — copy-paste captions + top-jobs data for TikTok/FB/LinkedIn."""
from __future__ import annotations


def _fmt(n: float) -> str:
    return f"Rs. {n / 100000:.1f}L" if n >= 100000 else f"Rs. {round(n / 1000)}k"


def weekly_pack() -> dict:
    from . import board as job_board
    from . import salary as pay
    jobs = job_board.list_all()
    priced = []
    for j in jobs:
        r = pay.parse_salary(j.get("salary", ""))
        if r:
            priced.append({**j, "_lo": r[0], "_hi": r[1]})
    priced.sort(key=lambda x: -x["_hi"])
    top = priced[:3]
    fresh = sorted(jobs, key=lambda x: -(x.get("created_at") or 0))[:5]

    caps = []
    if top:
        lines = "\n".join(f"{i + 1}. {j['title']} @ {j['company']} — {_fmt(j['_lo'])}–{_fmt(j['_hi'])}/mo"
                          for i, j in enumerate(top))
        caps.append({"label_en": "Top paying this week", "label_ne": "यो हप्ता धेरै तलब",
                     "en": f"💰 TOP PAYING JOBS IN NEPAL THIS WEEK\n\n{lines}\n\nCheck your match score free 👇\n#NepalJobs #Hiring",
                     "ne": f"💰 यो हप्ताका धेरै तलबका जागिर\n\n{lines}\n\nनिःशुल्क म्याच स्कोर हेर्नुहोस् 👇\n#NepalJobs"})
    if fresh:
        lines = "\n".join(f"• {j['title']} @ {j['company']} ({j.get('location', '')})" for j in fresh)
        caps.append({"label_en": "Fresh roles", "label_ne": "नयाँ पदहरू",
                     "en": f"🆕 FRESH ROLES JUST POSTED\n\n{lines}\n\nApply in 1 click + see your AI match 👇",
                     "ne": f"🆕 भर्खर पोस्ट भएका पदहरू\n\n{lines}\n\n१ क्लिकमा आवेदन + AI म्याच हेर्नुहोस् 👇"})
    caps.append({"label_en": "How it works", "label_ne": "कसरी काम गर्छ",
                 "en": "Stop mass-applying ❌\n1. Paste your resume\n2. Get every job scored 0–100\n3. Apply where YOU fit ✅\nFree on AutomateJob 👇",
                 "ne": "जथाभावी आवेदन बन्द ❌\n1. रिजुमे हाल्नुहोस्\n2. हरेक जागिर ०–१०० स्कोर\n3. मिल्ने ठाउँमा आवेदन ✅\nAutomateJob मा निःशुल्क 👇"})
    return {"count": len(jobs), "priced": len(priced),
            "top": [{k: j[k] for k in ("id", "title", "company", "location", "salary")} for j in top],
            "fresh": [{k: j[k] for k in ("id", "title", "company", "location")} for j in fresh],
            "captions": caps}
