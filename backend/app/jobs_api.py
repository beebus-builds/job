"""Free job-source aggregator: Remotive + Arbeitnow + local + Nepal seeds."""
from __future__ import annotations

import time
import httpx

_cache: dict[str, tuple[float, list[dict]]] = {}
TTL = 600


def _norm(title, company, location, url, source, tags, description="",
          posted=None, salary=""):
    return {
        "title": title or "Untitled",
        "company": company or "Unknown",
        "location": location or "Remote",
        "url": url or "",
        "source": source,
        "tags": tags or [],
        "description": (description or "")[:2000],
        "posted": posted or "",
        "salary": salary or "",
    }


def _dedup(jobs: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for j in jobs:
        key = (j.get("url") or f"{j.get('title')}|{j.get('company')}").lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(j)
    return out


async def _fetch_remotive(query: str) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get("https://remotive.com/api/remote-jobs", params={"search": query} if query else {})
            r.raise_for_status()
            data = r.json().get("jobs", [])[:25]
            return [_norm(j.get("title"), j.get("company_name"), j.get("candidate_required_location"),
                          j.get("url"), "remotive", j.get("tags", []), j.get("description", ""),
                          j.get("publication_date", ""), j.get("salary", "")) for j in data]
    except Exception:
        return []


async def _fetch_arbeitnow(query: str) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get("https://www.arbeitnow.com/api/job-board-api")
            r.raise_for_status()
            data = r.json().get("data", [])[:40]
            if query:
                q = query.lower()
                data = [j for j in data if q in (j.get("title", "") + j.get("company_name", "") + " ".join(j.get("tags", []))).lower()]
            return [_norm(j.get("title"), j.get("company_name"), j.get("location"),
                          j.get("url"), "arbeitnow", j.get("tags", []), j.get("description", ""),
                          j.get("created_at", "")) for j in data[:25]]
    except Exception:
        return []


# Nepal-flavored seed jobs (MeroJob-style categories) so the board feels local even offline
NEPAL_SEED = [
    {"title": "Frontend Developer (React)", "company": "Sajilo Tech", "location": "Kathmandu · Hybrid",
     "url": "", "source": "seed-np", "tags": ["React", "TypeScript", "Tailwind CSS"],
     "description": "Build React/Next.js features for fintech clients. REST APIs, Jest testing, GitHub Actions CI/CD. Freshers with strong projects welcome."},
    {"title": "Backend Engineer (Python)", "company": "Himal Data", "location": "Lalitpur · On-site",
     "url": "", "source": "seed-np", "tags": ["Python", "FastAPI", "PostgreSQL", "Docker"],
     "description": "Design FastAPI services, PostgreSQL schemas, Docker deploys on AWS, pytest, Kafka events."},
    {"title": "Digital Marketing Executive", "company": "Everest Mart", "location": "Kathmandu · On-site",
     "url": "", "source": "seed-np", "tags": ["SEO", "Communication"],
     "description": "Run SEO + social campaigns, HubSpot CRM, analytics reporting. Strong written English required."},
    {"title": "Accountant", "company": "Trishuli Traders", "location": "Pokhara · On-site",
     "url": "", "source": "seed-np", "tags": ["Excel", "Communication"],
     "description": "Bookkeeping, VAT filing, Excel modeling, monthly P&L. BBS/MBS preferred."},
    {"title": "UI/UX Designer", "company": "Yeti Studio", "location": "Remote (Nepal)",
     "url": "", "source": "seed-np", "tags": ["Figma", "UI/UX", "HTML", "CSS"],
     "description": "Figma prototypes, design system, collaborate with React developers. Portfolio required."},
    {"title": "DevOps Intern", "company": "Cloud Himalaya", "location": "Kathmandu · Hybrid",
     "url": "", "source": "seed-np", "tags": ["Linux", "Docker", "AWS", "Git"],
     "description": "Learn Linux admin, Docker, AWS deploys, CI/CD. Stipend + full-time conversion."},
]

SEED = [
    {"title": "Frontend Developer (React)", "company": "Acme SaaS", "location": "Remote",
     "url": "", "source": "seed", "tags": ["React", "TypeScript", "Tailwind CSS"],
     "description": "Build React/Next.js features, Tailwind styling, REST APIs, Jest testing, CI/CD with GitHub Actions."},
    {"title": "ML Engineer", "company": "Insight AI", "location": "Hybrid — NYC",
     "url": "", "source": "seed", "tags": ["Python", "PyTorch", "MLOps", "AWS"],
     "description": "Train PyTorch models, build ML pipelines, LangChain + LLMs, Docker, Kubernetes, MLflow."},
]


def _apply_filters(jobs: list[dict], location: str = "", remote_only: bool = False,
                   source: str = "") -> list[dict]:
    out = jobs
    if source:
        out = [j for j in out if j.get("source") == source]
    if remote_only:
        out = [j for j in out if "remote" in (j.get("location", "") or "").lower()]
    if location:
        q = location.lower()
        out = [j for j in out if q in (j.get("location", "") or "").lower()
               or q in (j.get("company", "") or "").lower()]
    return out


async def search_jobs(query: str = "", location: str = "", remote_only: bool = False,
                      source: str = "") -> list[dict]:
    key = f"{query}|{location}|{remote_only}|{source}".lower().strip()
    now = time.time()
    if key in _cache and now - _cache[key][0] < TTL:
        return _cache[key][1]
    rem, arb = await _fetch_remotive(query), await _fetch_arbeitnow(query)
    pool = _dedup(rem + arb)
    if not pool:
        pool = list(NEPAL_SEED) + list(SEED)
        if query:
            q = query.lower()
            matched = [j for j in pool if q in (j["title"] + j["company"] + " ".join(j["tags"]) + j["description"]).lower()]
            pool = matched or pool
    results = _apply_filters(pool, location, remote_only, source)
    _cache[key] = (now, results)
    return results
