"""Interview prep — question generation from JDs + heuristic answer feedback. No LLM."""
from __future__ import annotations

import re
from collections import Counter

from .matcher import extract_skills, top_keywords

# Per-skill technical prompts (EN + NE). Fallback generated from keywords.
SKILL_Q = {
    "Python": ("Explain list vs tuple vs set — when would you pick each?",
               "सूची (list), टुपल र सेटबीच फरक र कहिले कुन प्रयोग गर्ने, व्याख्या गर्नुहोस्।"),
    "React": ("How do hooks replace class lifecycle methods? Explain useEffect cleanup.",
              "हुकले क्लास लाइफसाइकललाई कसरी प्रतिस्थापन गर्छ? useEffect क्लिनअप बुझाउनुहोस्।"),
    "JavaScript": ("Explain event loop, promises and async/await with an example.",
                   "इभेन्ट लुप, promiselike र async/await उदाहरणसहित बुझाउनुहोस्।"),
    "TypeScript": ("Why migrate JS to TS? Explain interfaces vs types.",
                   "JS बाट TS किन? interface र type बीच फरक बुझाउनुहोस्।"),
    "SQL": ("Write a query joining two tables and explain INNER vs LEFT JOIN.",
            "दुई टेबल जोड्ने क्वेरी लेख्नुहोस्; INNER र LEFT JOIN बुझाउनुहोस्।"),
    "PostgreSQL": ("How do indexes speed up queries? What would you EXPLAIN first?",
                   "इन्डेक्सले क्वेरी कसरी छिटो बनाउँछ? EXPLAIN मा के हेर्नुहुन्छ?"),
    "AWS": ("How would you deploy a web app on AWS? Walk through the pieces.",
            "AWS मा वेब एप कसरी डिप्लोय गर्नुहुन्छ? प्रक्रिया बुझाउनुहोस्।"),
    "Docker": ("What problem do containers solve vs VMs? Write a minimal Dockerfile mentally.",
               "VM भन्दा कन्टेनरले के समस्या समाधान गर्छ? न्यूनतम Dockerfile भन्नुहोस्।"),
    "FastAPI": ("How does FastAPI validate requests? Explain Pydantic + dependency injection.",
                "FastAPI ले अनुरोध कसरी प्रमाणित गर्छ? Pydantic र dependency injection बुझाउनुहोस्।"),
    "Django": ("Explain Django MTV, ORM query optimization and middleware.",
               "Django MTV, ORM अप्टिमाइजेसन र middleware बुझाउनुहोस्।"),
    "Java": ("Explain OOP pillars in Java with a real example you built.",
             "तपाईंले बनाएको उदाहरणबाट Java का OOP सिद्धान्त बुझाउनुहोस्।"),
    "Node.js": ("How does Node handle concurrency without threads? What blocks it?",
                "थ्रेडबिना Node ले concurrency कसरी सम्हाल्छ? के कुराले ब्लक गर्छ?"),
    "Git": ("Walk through your branching + review workflow on a team.",
            "टोलीमा तपाईंको branching र review प्रक्रिया बुझाउनुहोस्।"),
    "REST APIs": ("Design a REST endpoint for this product. How do you version and paginate?",
                  "यो उत्पादनका लागि REST एन्डपोइन्ट डिजाइन गर्नुहोस्; versioning/pagination कसरी?"),
    "Machine Learning": ("How do you detect overfitting, and what do you do about it?",
                         "Overfitting कसरी थाहा पाउने र के गर्ने?"),
    "SEO": ("How would you grow organic traffic for a new site in 90 days?",
            "नयाँ साइटको organic ट्राफिक ९० दिनमा कसरी बढाउने?"),
    "Figma": ("Walk through your design-to-handoff process with developers.",
              "डेभलपरसँगको design-to-handoff प्रक्रिया बुझाउनुहोस्।"),
    "Excel": ("How do you build a reliable monthly report model others can audit?",
              "अरूले जाँच्न सक्ने मासिक रिपोर्ट मोडेल कसरी बनाउनुहुन्छ?"),
    "Communication": ("Tell me about a misunderstanding you resolved at work.",
                      "काममा सुल्झाएको गलतफहमीबारे भन्नुहोस्।"),
}

BEHAVIORAL = {
    "en": [
        "Tell me about yourself in 2 minutes, ending with why this role.",
        "Describe a hard deadline you met. What did you sacrifice, and what did you learn?",
        "Tell me about a disagreement with a teammate. How was it resolved?",
        "Describe a failure. What would you do differently now?",
        "Why this company — what specifically attracts you here?",
    ],
    "ne": [
        "२ मिनेटमा आफ्नो परिचय दिनुहोस्, यो भूमिका किन भन्नेमा टुङ्ग्याउनुहोस्।",
        "पूरा गरेको कठिन डेडलाइनबारे भन्नुहोस्। के त्याग्नुभयो, के सिक्नुभयो?",
        "सहकर्मीसँगको मतभेदबारे भन्नुहोस्। कसरी समाधान भयो?",
        "असफलताबारे भन्नुहोस्। अहिले के फरक गर्नुहुन्छ?",
        "यो कम्पनी किन — यहाँ के कुराले आकर्षित गर्‍यो?",
    ],
}

TIPS = {
    "en": [
        "Use STAR: Situation → Task → Action → Result, with numbers.",
        "60–90 seconds per answer. Pause, then land the point.",
        "End technical answers with a tradeoff ('I'd pick X because…').",
    ],
    "ne": [
        "STAR प्रयोग गर्नुहोस्: परिस्थिति → कार्य → कदम → नतिजा, अङ्कसहित।",
        "प्रति उत्तर ६०–९० सेकेन्ड। रोकिनुहोस्, अनि निष्कर्षमा पुग्नुहोस्।",
        "प्राविधिक उत्तर ट्रेडअफमा टुङ्ग्याउनुहोस् ('म X रोज्छु किनभने…')।",
    ],
}

FILLERS = {"um", "uh", "like", "you know", "basically", "actually", "stuff", "things",
           "अँ", "है", "मतलब", "जस्तो", "यस्तो"}
ACTION = {"built", "led", "shipped", "designed", "reduced", "increased", "owned", "launched",
          "fixed", "automated", "mentored", "बनाएँ", "बनाए", "घटाएँ", "बढाएँ", "सुरु"}


def questions(job_description: str, lang: str = "en") -> dict:
    lang = lang if lang in ("en", "ne") else "en"
    skills = extract_skills(job_description)
    tech: list[str] = []
    for s in skills:
        if s in SKILL_Q:
            tech.append(SKILL_Q[s][0] if lang == "en" else SKILL_Q[s][1])
        if len(tech) >= 6:
            break
    for kw in top_keywords(job_description, 8):
        if len(tech) >= 8:
            break
        if lang == "en":
            tech.append(f"Explain '{kw}' as you would to a smart junior. Then go one level deeper.")
        else:
            tech.append(f"'{kw}' बुझ्ने जुनियरलाई बुझाउनुहोस्, अनि एक तह गहिरो जानुहोस्।")
    return {"technical": tech[:8], "behavioral": BEHAVIORAL[lang],
            "skills_detected": skills, "tips": TIPS[lang]}


def feedback(question: str, answer: str, lang: str = "en") -> dict:
    lang = lang if lang in ("en", "ne") else "en"
    words = re.findall(r"[\w’']+", (answer or "").lower())
    n = len(words)
    qkeys = {w for w in re.findall(r"[\w’']+", (question or "").lower()) if len(w) > 3}
    cover = sum(1 for w in set(words) if w in qkeys)
    fills = sum(1 for w in words if w in FILLERS)
    acts = sum(1 for w in words if w in ACTION)
    has_num = bool(re.search(r"\d", answer or ""))

    score = 50
    if n >= 60:
        score += 20
    elif n >= 30:
        score += 10
    elif n < 15:
        score -= 20
    score += min(15, cover * 3)
    score += min(10, acts * 3)
    if has_num:
        score += 5
    score -= min(15, fills * 3)
    score = max(5, min(98, score))

    if lang == "ne":
        tips = []
        if n < 30:
            tips.append("उत्तर छोटो छ — STAR मा परिस्थिति र नतिजा थप्नुहोस्।")
        if cover < 2:
            tips.append("प्रश्नका मुख्य शब्द आफ्नै भाषामा दोहोर्‍याउनुहोस्।")
        if not has_num:
            tips.append("एउटा अङ्क थप्नुहोस् (%, समय, प्रयोगकर्ता)।")
        if fills > 2:
            tips.append("फिलर शब्द घटाउनुहोस्, छोटा वाक्य बोल्नुहोस्।")
        if acts == 0:
            tips.append("आफूले गरेको काम क्रियापदमा भन्नुहोस् (बनाएँ, घटाएँ…)।")
        if not tips:
            tips.append("राम्रो उत्तर — अब यसलाई ९० सेकेन्डमा भन्न अभ्यास गर्नुहोस्।")
    else:
        tips = []
        if n < 30:
            tips.append("Too short — add Situation and Result via STAR.")
        if cover < 2:
            tips.append("Echo the question's key terms in your own words.")
        if not has_num:
            tips.append("Add one number (%, time, users).")
        if fills > 2:
            tips.append("Cut filler words; use short sentences.")
        if acts == 0:
            tips.append("Use action verbs about what YOU did (built, led, shipped).")
        if not tips:
            tips.append("Strong answer — now rehearse it in 90 seconds.")
    return {"score": score, "words": n, "keyword_hits": cover,
            "filler_words": fills, "action_verbs": acts, "has_numbers": has_num,
            "tips": tips}
