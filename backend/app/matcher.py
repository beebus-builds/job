"""Custom AI matching engine — built from scratch, no external LLM.

Pipeline:
  1. normalize + tokenize (lowercase, alnum, stopword removal)
  2. skill extraction via ontology (skills.py)
  3. TF-IDF vectors built on the fly from the 2 docs (+ IDF smoothing)
  4. cosine similarity -> base semantic score
  5. blended final score = 0.55*cosine + 0.35*skill_overlap + 0.10*title_bonus
  6. keyword gaps + actionable suggestions

This is intentionally dependency-free so it runs anywhere.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from .skills import SKILL_ALIASES

STOPWORDS = frozenset("""
a an and are as at be but by for from has he in is it its of on that the to was were
will with you your we our they them this that these those or if then than so such
no not only own same than too very can just don should now into over after before
between through during each other more most other some such only own same so than
too very can will just don should now job role work team company experience skills
required preferred plus ability strong including join help build looking seek seeking
candidate ideal bonus familiarity knowledge years year day days opportunity apply
""".split())

TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#.\-/]*")


def tokenize(text: str) -> list[str]:
    text = (text or "").lower().replace("’", "'")
    tokens = TOKEN_RE.findall(text)
    out: list[str] = []
    for t in tokens:
        t = t.strip(".-/")
        if not t or t in STOPWORDS or len(t) < 2:
            continue
        # light stemming: plurals
        if len(t) > 4 and t.endswith("ies"):
            t = t[:-3] + "y"
        elif len(t) > 4 and t.endswith("es") and not t.endswith(("sses", "xes")):
            t = t[:-1] if t.endswith("s") else t
        elif len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        out.append(t)
    return out


def extract_skills(text: str) -> list[str]:
    lowered = f" {(text or '').lower()} "
    found: set[str] = set()
    for alias, canonical in SKILL_ALIASES.items():
        pat = alias.lower()
        # match with word boundaries for short aliases
        if len(pat) <= 3:
            if re.search(rf"(?<![a-z0-9+#]){re.escape(pat)}(?![a-z0-9+#])", lowered):
                found.add(canonical)
        else:
            if pat in lowered:
                found.add(canonical)
    return sorted(found)


def _tf(tokens: list[str]) -> Counter:
    c = Counter(tokens)
    total = max(1, len(tokens))
    return Counter({k: v / total for k, v in c.items()})


def _idf(doc_freq: dict[str, int], n_docs: int) -> dict[str, float]:
    return {t: math.log((1 + n_docs) / (1 + df)) + 1.0 for t, df in doc_freq.items()}


def cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a.get(k, 0.0) * v for k, v in b.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def top_keywords(text: str, n: int = 12) -> list[str]:
    toks = tokenize(text)
    c = Counter(toks)
    # drop pure numbers
    items = [(w, f) for w, f in c.most_common() if not w.replace(".", "").isdigit()]
    return [w for w, _ in items[:n]]


@dataclass
class MatchResult:
    score: int
    cosine_similarity: float
    skill_overlap: float
    matched_skills: list[str]
    missing_skills: list[str]
    resume_skills: list[str]
    job_skills: list[str]
    top_resume_keywords: list[str]
    top_job_keywords: list[str]
    suggestions: list[str]


SUG_T = {
    "en": {
        "missing": "Add evidence for: {items} (projects, bullets, skills section).",
        "mirror": "Mirror job language: {items}.",
        "short": "Resume looks short (<150 words) — add quantified achievements (%, $, time saved).",
        "low": "Skill overlap is low — tailor your skills section to this posting, don't mass-apply.",
        "strong": "Strong fit — quantify impact and keep resume to 1-2 pages.",
    },
    "ne": {
        "missing": "प्रमाण थप्नुहोस्: {items} (परियोजना, बुलेट, सीप खण्डमा)।",
        "mirror": "जागिरको भाषा मिलाउनुहोस्: {items}।",
        "short": "रिजुमे छोटो देखिन्छ (<150 शब्द) — मापनयोग्य उपलब्धि थप्नुहोस् (%, $, बचत समय)।",
        "low": "सीप मेल कम छ — यो पोस्टअनुसार सीप खण्ड मिलाउनुहोस्, जथाभावी आवेदन नदिनुहोस्।",
        "strong": "राम्रो मेल छ — प्रभावलाई अङ्कमा देखाउनुहोस् र १-२ पेजमा राख्नुहोस्।",
    },
}


def match_resume_to_job(resume_text: str, job_description: str, lang: str = "en") -> MatchResult:
    resume_text = resume_text or ""
    job_description = job_description or ""

    r_toks = tokenize(resume_text)
    j_toks = tokenize(job_description)

    # TF-IDF over the 2-doc corpus
    df: dict[str, int] = {}
    for term in set(r_toks) | set(j_toks):
        df[term] = (1 if term in set(r_toks) else 0) + (1 if term in set(j_toks) else 0)
    idf = _idf(df, 2)
    r_tf, j_tf = _tf(r_toks), _tf(j_toks)
    r_vec = {t: f * idf.get(t, 1.0) for t, f in r_tf.items()}
    j_vec = {t: f * idf.get(t, 1.0) for t, f in j_tf.items()}
    cos = cosine(r_vec, j_vec)

    r_skills = extract_skills(resume_text)
    j_skills = extract_skills(job_description)
    r_set, j_set = set(r_skills), set(j_skills)
    matched = sorted(r_set & j_set)
    missing = sorted(j_set - r_set)
    overlap = (len(matched) / len(j_set)) if j_set else (1.0 if not r_set else 0.5)

    # Title/keyword bonus: do rare job keywords appear in resume?
    job_top = set(top_keywords(job_description, 20))
    resume_set = set(r_toks)
    hit = sum(1 for w in job_top if w in resume_set)
    title_bonus = (hit / max(1, len(job_top))) if job_top else 0.0

    final = 0.55 * cos + 0.35 * overlap + 0.10 * title_bonus
    # scale: cosine is usually low (0.05-0.4) for 2 docs, so boost curve
    score = int(round(max(0.0, min(1.0, final * 1.6)) * 100))

    suggestions: list[str] = []
    t = SUG_T.get(lang if lang in SUG_T else "en", SUG_T["en"])
    if missing:
        suggestions.append(t["missing"].format(items=", ".join(missing[:6])))
    low_overlap_terms = [w for w in top_keywords(job_description, 10) if w not in resume_set][:5]
    if low_overlap_terms:
        suggestions.append(t["mirror"].format(items=", ".join(low_overlap_terms)))
    if len(resume_text.split()) < 150:
        suggestions.append(t["short"])
    if j_skills and overlap < 0.4:
        suggestions.append(t["low"])
    if not suggestions:
        suggestions.append(t["strong"])

    return MatchResult(
        score=score,
        cosine_similarity=round(cos, 4),
        skill_overlap=round(overlap, 4),
        matched_skills=matched,
        missing_skills=missing,
        resume_skills=r_skills,
        job_skills=j_skills,
        top_resume_keywords=top_keywords(resume_text),
        top_job_keywords=top_keywords(job_description),
        suggestions=suggestions,
    )


def rank_jobs(resume_text: str, jobs: list[dict]) -> list[dict]:
    """Score many jobs against one resume. Returns jobs sorted desc by score.

    Each job dict may have 'description' and/or 'tags'/'title'.
    Attaches: score, matched_skills, missing_skills, skill_overlap.
    """
    ranked: list[dict] = []
    for j in jobs:
        blob = " ".join([
            str(j.get("title", "")),
            " ".join(j.get("tags", []) or []),
            str(j.get("description", "")),
        ])
        try:
            m = match_resume_to_job(resume_text, blob)
            ranked.append({**j, "score": m.score,
                           "matched_skills": m.matched_skills,
                           "missing_skills": m.missing_skills,
                           "skill_overlap": m.skill_overlap})
        except Exception:
            ranked.append({**j, "score": 0, "matched_skills": [],
                           "missing_skills": [], "skill_overlap": 0.0})
    ranked.sort(key=lambda x: x.get("score", 0), reverse=True)
    return ranked


def rank_jobs_lang(resume_text: str, jobs: list[dict], lang: str = "en") -> list[dict]:
    """rank_jobs + translated per-job suggestions for the UI detail view."""
    ranked = rank_jobs(resume_text, jobs)
    for j in ranked:
        blob = " ".join([str(j.get("title", "")), " ".join(j.get("tags", []) or []),
                         str(j.get("description", ""))])
        try:
            j["suggestions"] = match_resume_to_job(resume_text, blob, lang).suggestions
        except Exception:
            j["suggestions"] = []
    return ranked
