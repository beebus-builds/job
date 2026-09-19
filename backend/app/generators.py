"""Template-based generators — no LLM needed."""
from __future__ import annotations

import re

from .matcher import extract_skills, match_resume_to_job, top_keywords
from .skills import BIASED_WORDS


def generate_cover_letter(name: str, role: str, company: str, resume_text: str,
                          job_description: str, lang: str = "en") -> str:
    m = match_resume_to_job(resume_text, job_description)
    matched = ", ".join(m.matched_skills[:5]) or ("relevant skills" if lang != "ne" else "सान्दर्भिक सीपहरू")
    keywords = ", ".join(m.top_job_keywords[:4])
    if lang == "ne":
        return f"""{company or 'सम्बन्धित टोली'} का श्रीमान् नियुक्ति प्रबन्धकज्यू,

{role or 'खुला पद'} का लागि आवेदन दिन पाउँदा म ज्यादै उत्साहित छु। {matched} मा मेरो व्यावहारिक अनुभवका आधारमा म पहिलो दिनदेखि नै योगदान दिन सक्छु भन्ने विश्वास छ।

यस भूमिकामा {keywords} मा केन्द्रित हुनु मलाई विशेष रूपमा मनपर्‍यो। मेरो हालको काममा मैले:
- {matched} सँग सम्बन्धित मापनयोग्य नतिजा दिएको छु
- टोलीसँग मिलेर काम गरी प्रगति स्पष्ट रूपमा प्रस्तुत गरेको छु
- नयाँ उपकरण चाँडै सिकेर जिम्मेवारी पूरा गरेको छु

{company or 'तपाईंको टोली'} को सफलतामा मैले कसरी योगदान दिन सक्छु भन्ने विषयमा कुरा गर्ने अवसर पाए आभारी हुनेछु। धन्यवाद।

भवदीय,
{name or 'निवेदक'}
"""
    return f"""Dear Hiring Manager at {company or 'your team'},

I am excited to apply for the {role or 'open role'}. With hands-on experience in {matched}, I am confident I can contribute from day one.

What stands out about this role is its focus on {keywords}. In my recent work I have:
- Delivered measurable outcomes tied to {matched}
- Collaborated cross-functionally and communicated progress clearly
- Learned new tools quickly and owned problems end to end

I would welcome the chance to discuss how I can help {company or 'your team'} succeed. Thank you for your consideration.

Sincerely,
{name or 'Candidate'}
"""


def generate_job_post(title: str, company: str, location: str, work_type: str,
                      skills: list[str], responsibilities: str, salary: str = "") -> str:
    skills_md = "\n".join(f"- {s.strip()}" for s in skills if s.strip()) or "- (add 4-6 key skills)"
    sal = f"\n**Compensation:** {salary}\n" if salary else ""
    return f"""# {title} — {company}

**Location:** {location or 'Remote'} · **Type:** {work_type or 'Full-time'}
{sal}
## About the role
We are hiring a {title} to join {company}. You will work with a supportive team, own meaningful problems, and grow your craft.

## What you'll do
{responsibilities or '- Ship high-quality work\\n- Collaborate with design/product\\n- Improve reliability and velocity'}

## What you'll bring
{skills_md}
- Strong communication and ownership
- 2+ years of relevant experience (or equivalent projects)

## Benefits
- Flexible work, learning budget, health coverage

## How to apply
Apply with your resume and a short note about a project you are proud of. We review every application.
"""


def score_job_post(posting_text: str) -> dict:
    text = posting_text or ""
    words = re.findall(r"[A-Za-z0-9']+", text)
    wc = len(words)
    clarity = 100
    if wc < 120:
        clarity -= 25
    elif wc > 900:
        clarity -= 15
    for token in ["responsibilit", "requirement", "benefit", "apply", "salary", "location"]:
        if token not in text.lower():
            clarity -= 5
    clarity = max(5, min(100, clarity))

    lowered = text.lower()
    hits = [w for w in BIASED_WORDS if w in lowered]
    inclusivity = max(0, 100 - 20 * len(hits))

    skills = extract_skills(text)
    seo = 50
    if skills:
        seo += min(40, 8 * len(skills))
    if wc >= 200:
        seo += 10
    seo = min(100, seo)

    tips: list[str] = []
    if wc < 120:
        tips.append("Posting is short — aim for 250-600 words with role, responsibilities, requirements, benefits.")
    if not skills:
        tips.append("No recognizable skills detected — list 4-8 concrete tools/skills.")
    if hits:
        tips.append(f"Replace biased/loaded words: {', '.join(hits)}.")
    if "salary" not in lowered and "compensation" not in lowered:
        tips.append("Add a salary range — postings with pay get far more applicants.")
    if not tips:
        tips.append("Posting looks solid. Keep sentences short and scannable.")
    return {
        "clarity": clarity,
        "inclusivity": inclusivity,
        "seo": seo,
        "word_count": wc,
        "skills_detected": skills,
        "biased_words": hits,
        "tips": tips,
    }
