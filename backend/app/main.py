from __future__ import annotations

from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .generators import generate_cover_letter, generate_job_post, score_job_post
from .jobs_api import search_jobs
from .matcher import match_resume_to_job, rank_jobs, rank_jobs_lang
from . import tracker as store
from . import resumes as resume_store
from . import board as job_board
from . import alerts as alert_store
from . import sms as sms_util
from . import auth as accounts
from . import ats
from . import sites
from . import interview as prep
from . import salary as pay
from . import social as buzz
from . import engage


def _uid(request: Request) -> int | None:
    return accounts.user_id_from_header(request.headers.get("authorization", ""))

app = FastAPI(title="AutomateJob API", version="0.2.0")


@app.on_event("startup")
def _secrets_guard():
    import os as _os
    problems = []
    if _os.getenv("JWT_SECRET", "dev-secret-change-me") == "dev-secret-change-me":
        problems.append("JWT_SECRET is the dev default — set a 32+ char secret in prod")
    if _os.getenv("ADMIN_TOKEN", "admin-dev-only") == "admin-dev-only":
        problems.append("ADMIN_TOKEN is the dev default — rotate before going public")
    if not _os.getenv("SMTP_HOST") and "gmail.com" not in _os.getenv("SMTP_USER", "").lower():
        problems.append("no SMTP sender — set SMTP_USER to a Gmail address (+ App Password) for Gmail delivery")
    if not (_os.getenv("ESEWA_MERCHANT") and _os.getenv("ESEWA_SECRET")):
        problems.append("eSewa creds unset — paid featuring disabled (manual approval only)")
    for p in problems:
        print(f"[security] {p}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- light in-memory rate limiting (anti-spam for writes) ----
import time as _time
from collections import defaultdict as _dd

_hits: dict[str, list[float]] = _dd(list)
RATE_LIMIT = 30  # writes per IP per minute on guarded paths
GUARDED = ("/api/board", "/api/applicants", "/api/auth", "/api/alerts", "/api/referral")


@app.middleware("http")
async def _ratelimit(request: Request, call_next):
    if request.method in ("POST", "PATCH", "DELETE") and request.url.path.startswith(GUARDED):
        ip = (request.client.host if request.client else "?") if hasattr(request, "client") else "?"
        now = _time.time()
        win = [t for t in _hits[ip] if now - t < 60]
        _hits[ip] = win
        if len(win) >= RATE_LIMIT:
            return JSONResponse({"error": "too many requests, slow down"}, status_code=429)
        win.append(now)
    return await call_next(request)


_DEV_ADMIN_TOKENS = {"admin-dev-only", "change-me-to-something-private"}


def _is_admin(request: Request) -> bool:
    """Admin gate. SECURITY: admin access is DISABLED unless ADMIN_TOKEN is a
    real (non-default, 16+ char) secret — a deployment that never set the env
    var must not have a guessable public admin token."""
    import hmac as _hm, os as _os
    want = _os.getenv("ADMIN_TOKEN", "").strip()
    if not want or want in _DEV_ADMIN_TOKENS or len(want) < 16:
        return False
    got = request.headers.get("x-admin-token", "")
    return _hm.compare_digest(got, want)


class MatchIn(BaseModel):
    resume_text: str = Field(min_length=1)
    job_description: str = Field(min_length=1)
    lang: str = "en"


class RankIn(BaseModel):
    resume_text: str = Field(min_length=1)
    jobs: list[dict] = Field(default_factory=list)
    lang: str = "en"


class CoverIn(BaseModel):
    name: str = ""
    role: str = ""
    company: str = ""
    resume_text: str = ""
    job_description: str = ""
    lang: str = "en"


class JobPostGenIn(BaseModel):
    title: str = ""
    company: str = ""
    location: str = "Remote"
    work_type: str = "Full-time"
    skills: list[str] = []
    responsibilities: str = ""
    salary: str = ""


class JobPostScoreIn(BaseModel):
    posting_text: str = ""


class AppIn(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    url: str = ""
    status: str = "saved"
    notes: str = ""
    score: int = 0


class ResumeIn(BaseModel):
    name: str = "My Resume"
    text: str = ""


@app.get("/health")
def health():
    return {"ok": True, "engine": "custom-tfidf-v2-rank"}


@app.get("/api/jobs")
async def jobs(q: str = "", location: str = "", remote_only: bool = False,
               source: str = "", resume_text: str = "", sort_by_score: bool = False,
               destination: str = ""):
    results = await search_jobs(q, location, remote_only, source)
    if destination:
        dl = destination.lower()
        results = [j for j in results if dl in (j.get("destination", "") or "").lower()]
    if resume_text and sort_by_score:
        results = rank_jobs(resume_text, results)
    elif resume_text:
        # attach scores without re-sorting
        results = rank_jobs(resume_text, results)
        # keep original order? re-sort is more useful — keep ranked
    return {"query": q, "count": len(results), "results": results}


@app.post("/api/match")
def match(inp: MatchIn):
    m = match_resume_to_job(inp.resume_text, inp.job_description, inp.lang)
    return m.__dict__


@app.post("/api/rank")
def rank(inp: RankIn):
    ranked = rank_jobs_lang(inp.resume_text, inp.jobs, inp.lang)
    return {"count": len(ranked), "results": ranked}


@app.post("/api/cover-letter")
def cover(inp: CoverIn):
    letter = generate_cover_letter(inp.name, inp.role, inp.company, inp.resume_text, inp.job_description, inp.lang)
    return {"cover_letter": letter, "lang": inp.lang if inp.lang in ("en", "ne") else "en"}


@app.post("/api/job-post/generate")
def job_post_generate(inp: JobPostGenIn):
    post = generate_job_post(inp.title, inp.company, inp.location, inp.work_type,
                             inp.skills, inp.responsibilities, inp.salary)
    return {"posting": post, "score": score_job_post(post)}


@app.post("/api/job-post/score")
def job_post_score(inp: JobPostScoreIn):
    return score_job_post(inp.posting_text)


@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        return {"error": "File too large (max 5MB)"}
    name = (file.filename or "").lower()
    text = ""
    if name.endswith(".pdf"):
        try:
            from PyPDF2 import PdfReader
            import io
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception as e:
            return {"error": f"PDF parse failed: {e}"}
    elif name.endswith(".docx"):
        try:
            from docx import Document
            import io
            doc = Document(io.BytesIO(data))
            text = "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            return {"error": f"DOCX parse failed: {e}"}
    else:
        text = data.decode("utf-8", errors="ignore")
    return {"filename": file.filename, "chars": len(text), "resume_text": text[:20000]}


# Resume profiles
@app.get("/api/resumes")
def resumes_list(request: Request):
    return {"results": resume_store.list_all(_uid(request))}


# Resume profiles (all operations scoped to the caller — no cross-user IDOR)
@app.get("/api/resumes/{resume_id}")
def resumes_get(resume_id: int, request: Request):
    row = resume_store.get(resume_id, _uid(request))
    return row or {"error": "not found"}


@app.post("/api/resumes")
def resumes_create(inp: ResumeIn, request: Request):
    return resume_store.create(inp.name, inp.text, _uid(request))


@app.patch("/api/resumes/{resume_id}")
def resumes_update(resume_id: int, patch: dict, request: Request):
    row = resume_store.update(resume_id, patch, _uid(request))
    return row or {"error": "not found"}


@app.delete("/api/resumes/{resume_id}")
def resumes_delete(resume_id: int, request: Request):
    return {"deleted": resume_store.remove(resume_id, _uid(request))}


# Tracker CRUD + stats (scoped to account when logged in)
@app.get("/api/applications")
def apps_list(request: Request):
    return {"results": store.list_all(_uid(request))}


@app.get("/api/applications/stats")
def apps_stats(request: Request):
    return store.stats(_uid(request))


@app.post("/api/applications")
def apps_create(inp: AppIn, request: Request):
    return store.create(inp.model_dump(), _uid(request))


@app.patch("/api/applications/{app_id}")
def apps_update(app_id: int, patch: dict, request: Request):
    row = store.update(app_id, patch, _uid(request))
    return row or {"error": "not found"}


@app.delete("/api/applications/{app_id}")
def apps_delete(app_id: int, request: Request):
    return {"deleted": store.remove(app_id, _uid(request))}


class RegisterIn(BaseModel):
    email: str = ""
    password: str = ""
    name: str = ""
    ref: str = ""


class LoginIn(BaseModel):
    email: str = ""
    password: str = ""


@app.post("/api/auth/register")
def auth_register(inp: RegisterIn):
    res = accounts.register(inp.email, inp.password, inp.name)
    if "user" in res and inp.ref:
        try:
            if accounts.claim_referral(inp.ref, res["user"]["id"], res["user"]["email"]):
                res["referred"] = True
        except Exception:
            pass
    return res


@app.post("/api/auth/login")
def auth_login(inp: LoginIn):
    return accounts.login(inp.email, inp.password)


@app.get("/api/auth/me")
def auth_me(request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return accounts.me(uid) or {"error": "not found"}


@app.patch("/api/auth/profile")
def auth_profile(patch: dict, request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return accounts.update_profile(uid, patch) or {"error": "not found"}


@app.post("/api/auth/verify/send")
def auth_verify_send(request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return accounts.send_verify(uid)


class DeleteIn(BaseModel):
    password: str = ""


@app.delete("/api/auth/account")
def auth_delete(inp: DeleteIn, request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return accounts.delete_account(uid)


class MemberIn(BaseModel):
    email: str = ""
    role: str = "manager"


@app.get("/api/company-site/members")
def members_list(request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return {"results": job_board.list_members(uid)}


@app.post("/api/company-site/members")
def members_add(inp: MemberIn, request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return job_board.add_member(uid, inp.email, inp.role)


@app.delete("/api/company-site/members/{user_id}")
def members_drop(user_id: int, request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return {"deleted": job_board.drop_member(uid, user_id)}


@app.post("/api/admin/company/verify")
def admin_company_verify(payload: dict, request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    from . import sites as _sites
    c = _sites._conn()
    slug = (payload.get("slug") or "").strip()
    row = c.execute("SELECT id FROM company_sites WHERE slug=?", (slug,)).fetchone()
    if not row:
        c.close()
        return {"error": "not found"}
    c.execute("UPDATE company_sites SET verified=? WHERE slug=?",
              (1 if payload.get("verified", True) else 0, slug))
    c.commit()
    c.close()
    return {"ok": True, "slug": slug}


@app.get("/api/users/by-slug/{slug}")
def user_public(slug: str):
    return accounts.by_slug(slug) or {"error": "not found"}


@app.get("/api/referral/mine")
def referral_mine(request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    return accounts.referral_mine(uid)


@app.get("/api/referral/by-code/{code}")
def referral_sender(code: str):
    c = accounts._conn()
    row = c.execute("SELECT name, email FROM users WHERE referral_code=?", (code.strip(),)).fetchone()
    c.close()
    if not row:
        return {"error": "not found"}
    name = row["name"] or row["email"].split("@")[0]
    return {"name": name}


class ForgotIn(BaseModel):
    email: str = ""


class ResetIn(BaseModel):
    token: str = ""
    password: str = ""


class GoogleIn(BaseModel):
    id_token: str = ""


@app.post("/api/auth/forgot")
def auth_forgot(inp: ForgotIn):
    import os as _os
    res = accounts.issue_reset(inp.email)
    if res.get("sent"):
        link = f"{_os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset?token={res['token']}"
        alert_store.send_email(inp.email.strip().lower(), "Reset your AutomateJob password",
                               f"Click to reset (valid 1 hour):\n{link}\n\nIgnore this if you didn't ask.")
    # SECURITY: strip the plaintext token + user_id — the token travels by
    # email only. The response stays non-enumerable (always "ok": true,
    # no "sent" flag, so callers can't probe which emails are registered).
    return {"ok": True}


@app.post("/api/auth/reset")
def auth_reset(inp: ResetIn):
    return accounts.redeem_reset(inp.token, inp.password)


@app.post("/api/auth/google")
async def auth_google(inp: GoogleIn):
    return await accounts.google_login(inp.id_token)


class MagicIn(BaseModel):
    email: str = ""


class MagicRedeem(BaseModel):
    token: str = ""


@app.post("/api/auth/magic")
def auth_magic(inp: MagicIn):
    import os as _os
    res = accounts.issue_magic(inp.email)
    if res.get("sent"):
        link = f"{_os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login?magic={res['token']}"
        alert_store.send_email(inp.email.strip().lower(), "Your AutomateJob login link",
                               f"Click to log in (valid 15 minutes):\n{link}\n\nIgnore this if you didn't ask.")
    # SECURITY: strip the plaintext token + user_id — the token travels by
    # email only. Response stays non-enumerable for the same reason.
    return {"ok": True}


@app.post("/api/auth/magic/redeem")
def auth_magic_redeem(inp: MagicRedeem):
    return accounts.redeem_magic(inp.token)


def _me(request: Request) -> int:
    uid = _uid(request)
    if not uid:
        raise ValueError("unauthorized")
    return uid


# ---- company sites ----
@app.get("/api/company-site")
def company_own(request: Request):
    try:
        uid = _me(request)
    except ValueError:
        return {"error": "unauthorized"}
    return sites.get_company(uid) or {"exists": False}


@app.put("/api/company-site")
def company_save(data: dict, request: Request):
    try:
        uid = _me(request)
    except ValueError:
        return {"error": "unauthorized"}
    return sites.upsert_company(uid, data)


@app.get("/api/company-sites")
def company_all():
    return {"results": sites.company_list()}


@app.get("/api/company-site/by-slug/{slug}")
def company_one(slug: str):
    return sites.company_public(slug) or {"error": "not found"}


# ---- portfolio ----
@app.get("/api/portfolio/projects")
def proj_list(request: Request):
    try:
        return {"results": sites._items("projects", _me(request))}
    except ValueError:
        return {"error": "unauthorized"}


@app.post("/api/portfolio/projects")
def proj_add(data: dict, request: Request):
    try:
        return sites._add("projects", _me(request), data, sites.PROJ_FIELDS)
    except ValueError:
        return {"error": "unauthorized"}


@app.patch("/api/portfolio/projects/{iid}")
def proj_patch(iid: int, patch: dict, request: Request):
    try:
        return sites._patch("projects", _me(request), iid, patch, sites.PROJ_FIELDS) or {"error": "not found"}
    except ValueError:
        return {"error": "unauthorized"}


@app.delete("/api/portfolio/projects/{iid}")
def proj_del(iid: int, request: Request):
    try:
        return {"deleted": sites._drop("projects", _me(request), iid)}
    except ValueError:
        return {"error": "unauthorized"}


@app.get("/api/portfolio/experience")
def exp_list(request: Request):
    try:
        return {"results": sites._items("experience", _me(request))}
    except ValueError:
        return {"error": "unauthorized"}


@app.post("/api/portfolio/experience")
def exp_add(data: dict, request: Request):
    try:
        return sites._add("experience", _me(request), data, sites.EXP_FIELDS)
    except ValueError:
        return {"error": "unauthorized"}


@app.patch("/api/portfolio/experience/{iid}")
def exp_patch(iid: int, patch: dict, request: Request):
    try:
        return sites._patch("experience", _me(request), iid, patch, sites.EXP_FIELDS) or {"error": "not found"}
    except ValueError:
        return {"error": "unauthorized"}


@app.delete("/api/portfolio/experience/{iid}")
def exp_del(iid: int, request: Request):
    try:
        return {"deleted": sites._drop("experience", _me(request), iid)}
    except ValueError:
        return {"error": "unauthorized"}


@app.get("/api/portfolio/by-slug/{slug}")
def portfolio_one(slug: str):
    return sites.portfolio_bundle(slug) or {"error": "not found"}


# ---- CV ----
@app.get("/api/cv")
def cv_get(request: Request):
    try:
        return sites.get_cv(_me(request))
    except ValueError:
        return {"error": "unauthorized"}


class PrepQIn(BaseModel):
    job_description: str = ""
    lang: str = "en"


class PrepFIn(BaseModel):
    question: str = ""
    answer: str = Field(min_length=1)
    lang: str = "en"


@app.post("/api/interview/questions")
def interview_questions(inp: PrepQIn):
    return prep.questions(inp.job_description, inp.lang)


@app.post("/api/interview/feedback")
def interview_feedback(inp: PrepFIn):
    return prep.feedback(inp.question, inp.answer, inp.lang)


@app.get("/api/salary/insights")
async def salary_insights(q: str = "", category: str = "", location: str = ""):
    jobs = await search_jobs(q, location, False, "")
    pool = jobs
    if category:
        pool = [j for j in pool if category.lower() in (j.get("category", "") or "").lower()]
        if not pool:  # board posts lack category; fall back to full pool
            pool = jobs
    res = pay.insights(pool)
    res["query"] = q
    return res


@app.put("/api/cv")
def cv_save(data: dict, request: Request):
    try:
        return sites.save_cv(_me(request), data)
    except ValueError:
        return {"error": "unauthorized"}


class BoardIn(BaseModel):
    title: str = "Untitled"
    company: str = "Unknown"
    location: str = "Kathmandu"
    work_type: str = "Full-time"
    category: str = "Engineering"
    salary: str = ""
    description: str = ""
    skills: list[str] = []
    apply_url: str = ""
    contact_email: str = ""
    deadline: str = ""
    destination: str = ""


# Public employer board (powers SEO /jobs pages — no auth in v1)
@app.get("/api/board")
def board_list(q: str = "", category: str = "", location: str = "", destination: str = ""):
    results = job_board.list_all(q, category, location, destination)
    return {"count": len(results), "results": results, "categories": job_board.CATEGORIES}


@app.get("/api/board/{job_id}")
def board_get(job_id: int):
    row = job_board.get(job_id, bump_view=True)
    return row or {"error": "not found"}


@app.post("/api/board")
def board_create(inp: BoardIn, request: Request):
    data = inp.model_dump()
    data["user_id"] = _uid(request)
    return job_board.create(data)


@app.patch("/api/board/{job_id}")
def board_update(job_id: int, patch: dict, request: Request):
    if not job_board.get(job_id):
        return {"error": "not found"}
    if not (job_board.can_manage(job_id, _uid(request)) or _is_admin(request)):
        return {"error": "forbidden"}
    row = job_board.update(job_id, patch)
    return row or {"error": "not found"}


@app.delete("/api/board/{job_id}")
def board_delete(job_id: int, request: Request):
    if job_board.get(job_id) and not (job_board.can_manage(job_id, _uid(request)) or _is_admin(request)):
        return {"error": "forbidden"}
    return {"deleted": job_board.remove(job_id)}


@app.post("/api/board/{job_id}/apply")
def board_apply(job_id: int):
    row = job_board.record_apply(job_id)
    return row or {"error": "not found"}


@app.get("/api/board/analytics/summary")
def board_analytics_summary():
    return job_board.summary()


class ApplicantIn(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    resume_text: str = Field(min_length=1)
    cover_note: str = ""
    filename: str = ""


@app.post("/api/board/{job_id}/apply-full")
def board_apply_full(job_id: int, inp: ApplicantIn):
    if inp.email and not alert_store.valid_email(inp.email):
        return {"error": "invalid email"}
    res = ats.submit(job_id, inp.name, inp.email, inp.phone, inp.resume_text, inp.cover_note, inp.filename)
    if isinstance(res, dict) and res.get("id"):
        # notify the employer (post contact email, else owner account email)
        job = job_board.get(job_id) or {}
        to = (job.get("contact_email") or "").strip() or accounts.email_of(job_board.owner_of(job_id))
        if to and alert_store.valid_email(to):
            matched = ", ".join((res.get("matched_skills") or [])[:5])
            alert_store.send_email(
                to, f"New applicant: {inp.name or inp.email or 'Someone'} for '{job.get('title', 'your post')}'",
                f"New application on AutomateJob:\n\n- Job: {job.get('title', '')} @ {job.get('company', '')}\n"
                f"- Candidate: {inp.name} <{inp.email}> {inp.phone}\n"
                f"- AI match: {res.get('score')}/100" + (f" (fits: {matched})" if matched else "") + "\n\n"
                f"Review in your inbox: /employers")
    return res


@app.get("/api/board/{job_id}/applicants")
def board_applicants(job_id: int, request: Request):
    if not job_board.can_manage(job_id, _uid(request)):
        return {"error": "forbidden"}
    if not job_board.get(job_id):
        return {"error": "not found"}
    return {"results": ats.list_for(job_id), "funnel": ats.funnel(job_id)}


@app.get("/api/applicants/{aid}")
def applicant_get(aid: int, request: Request):
    a = ats.get(aid)
    if not a:
        return {"error": "not found"}
    if not job_board.can_manage(a["job_id"], _uid(request)):
        return {"error": "forbidden"}
    return a


@app.patch("/api/applicants/{aid}")
def applicant_update(aid: int, patch: dict, request: Request):
    a = ats.get(aid)
    if not a:
        return {"error": "not found"}
    if not job_board.can_manage(a["job_id"], _uid(request)):
        return {"error": "forbidden"}
    old_status = a.get("status")
    row = ats.update(aid, patch) or {"error": "not found"}
    # notify the candidate when their stage actually changes
    if isinstance(row, dict) and row.get("status") and row["status"] != old_status and row.get("email"):
        job = job_board.get(a["job_id"]) or {}
        when = ""
        try:
            if row.get("interview_at"):
                import datetime as _dt
                when = f"\nInterview scheduled: {_dt.datetime.fromtimestamp(row['interview_at']).strftime('%Y-%m-%d %H:%M')}\n"
        except Exception:
            pass
        alert_store.send_email(
            row["email"], f"Update on your application: {job.get('title', 'the role')}",
            f"Hi {row.get('name') or 'there'},\n\nYour application for "
            f"'{job.get('title', '')}' @ {job.get('company', '')} moved to: {row['status']}.{when}\n"
            f"Good luck!\n— AutomateJob")
    return row


@app.delete("/api/applicants/{aid}")
def applicant_delete(aid: int, request: Request):
    a = ats.get(aid)
    if not a:
        return {"error": "not found"}
    if not job_board.can_manage(a["job_id"], _uid(request)):
        return {"error": "forbidden"}
    return {"deleted": ats.remove(aid)}


class ReportIn(BaseModel):
    reason: str = "other"
    email: str = ""
    details: str = ""


@app.post("/api/board/{job_id}/report")
def board_report(job_id: int, inp: ReportIn):
    return job_board.report_job(job_id, inp.reason, inp.email, inp.details)


@app.get("/api/my-applications")
def my_applications(email: str = ""):
    if not alert_store.valid_email(email):
        return {"error": "invalid email"}
    return {"results": job_board.my_applications(email)}


@app.get("/api/admin/reports")
def admin_reports(request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    return {"results": job_board.list_reports()}


class TestMailIn(BaseModel):
    to: str = ""


@app.get("/api/admin/mail-status")
def admin_mail_status(request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    cfg = alert_store.smtp_config()
    return {"provider": cfg["provider"], "host": cfg["host"], "port": cfg["port"],
            "user_set": bool(cfg["user"]), "pass_set": bool(cfg["pass"]),
            "from": cfg["from"]}


@app.post("/api/admin/test-email")
def admin_test_email(inp: TestMailIn, request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    if not alert_store.valid_email(inp.to):
        return {"error": "invalid email"}
    return alert_store.send_email(inp.to, "AutomateJob test email",
                                  "This is a test from your AutomateJob backend. Email delivery works.")


@app.delete("/api/admin/reports/{rid}")
def admin_dismiss(rid: int, request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    return {"deleted": job_board.dismiss_report(rid)}


class FeatureIn(BaseModel):
    days: int = 7


@app.post("/api/board/{job_id}/feature")
def board_feature(job_id: int, inp: FeatureIn, request: Request):
    if not job_board.get(job_id):
        return {"error": "not found"}
    if not (job_board.can_manage(job_id, _uid(request)) or _is_admin(request)):
        return {"error": "forbidden"}
    return job_board.request_feature(job_id, inp.days)


@app.get("/api/admin/featured")
def admin_featured(request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    return {"results": job_board.list_feature_requests()}


class BillingCfgOut(BaseModel):
    esewa_enabled: bool = False
    price_npr: int = 499


@app.get("/api/billing/config")
def billing_config():
    from . import billing as pay_gate
    c = pay_gate.cfg()
    return {"esewa_enabled": pay_gate.enabled(), "price_npr": c["price"], "mode": c["mode"]}


@app.post("/api/billing/esewa/initiate")
def billing_initiate(payload: dict, request: Request):
    from . import billing as pay_gate
    job_id = int(payload.get("job_id", 0))
    if not job_board.get(job_id):
        return {"error": "not found"}
    if not (job_board.can_manage(job_id, _uid(request)) or _is_admin(request)):
        return {"error": "forbidden"}
    if not pay_gate.enabled():
        return {"error": "payments not configured — ask admin about manual featuring"}
    fr = job_board.request_feature(job_id, int(payload.get("days", 7)))
    if "error" in fr:
        return fr
    init = pay_gate.initiate_fields(job_id, fr["id"], fr["days"])
    job_board.set_feature_txn(fr["id"], init["txn_uuid"])
    return {**init, "request_id": fr["id"]}


@app.get("/api/billing/esewa/success")
def billing_success(data: str = ""):
    from . import billing as pay_gate
    v = pay_gate.verify_response(data)
    if "error" in v:
        return v
    fr = job_board.find_feature_by_txn(v["txn"])
    if not fr:
        return {"error": "unknown transaction"}
    # SECURITY: the callback must be for the amount we billed for this exact
    # request (prevents underpaid/replayed callbacks from unlocking features).
    try:
        expected = pay_gate.expected_amount(fr["days"])
        got = float(v.get("amount") or 0)
    except Exception:
        return {"error": "bad amount"}
    if abs(got - expected) > 0.5:
        return {"error": "amount mismatch"}
    if fr.get("status") == "approved":  # idempotent: replays change nothing
        return {"ok": True, "already": True, "job_id": fr["job_id"]}
    job_board.approve_feature(fr["id"], True)
    return {"ok": True, "job_id": fr["job_id"], "amount": v["amount"]}


@app.get("/api/social/weekly")
def social_weekly():
    return buzz.weekly_pack()


class PushIn(BaseModel):
    endpoint: str = ""
    keys: dict = {}


@app.get("/api/push/vapid")
def push_vapid():
    return {"key": engage.vapid_key()}


@app.post("/api/push/subscribe")
def push_subscribe(inp: PushIn, request: Request):
    uid = _uid(request)
    if not uid:
        return {"error": "unauthorized"}
    if not inp.endpoint:
        return {"error": "no endpoint"}
    return engage.subscribe(uid, inp.endpoint, inp.keys)


class EndorseIn(BaseModel):
    skill: str = ""
    by_email: str = ""


@app.post("/api/users/id/{uid}/endorse")
def endorse_user(uid: int, inp: EndorseIn):
    return engage.endorse(uid, inp.skill, inp.by_email)


@app.post("/api/portfolio/by-slug/{slug}/endorse")
def endorse_slug(slug: str, inp: EndorseIn):
    from sqlite3 import connect as _connect
    from .db import path as _dbp
    c = _connect(_dbp())
    c.row_factory = __import__("sqlite3").Row
    row = c.execute("SELECT id FROM users WHERE slug=?", (slug,)).fetchone()
    c.close()
    if not row:
        return {"error": "not found"}
    return engage.endorse(row["id"], inp.skill, inp.by_email)


@app.get("/api/referral/leaderboard")
def referral_board():
    return {"results": engage.leaderboard()}


@app.post("/api/admin/featured/{rid}")
def admin_feature_decide(rid: int, patch: dict, request: Request):
    if not _is_admin(request):
        return {"error": "forbidden"}
    return job_board.approve_feature(rid, patch.get("approve", True)) or {"error": "not found"}


class MsgIn(BaseModel):
    subject: str = ""
    body: str = Field(min_length=1)


@app.post("/api/applicants/{aid}/message")
def applicant_message(aid: int, inp: MsgIn, request: Request):
    a = ats.get(aid)
    if not a:
        return {"error": "not found"}
    if not job_board.can_manage(a["job_id"], _uid(request)):
        return {"error": "forbidden"}
    if not a.get("email"):
        return {"error": "candidate has no email"}
    job = job_board.get(a["job_id"]) or {}
    subj = inp.subject or f"About your application: {job.get('title', 'the role')}"
    return alert_store.send_email(
        a["email"], subj,
        f"Hi {a.get('name') or 'there'},\n\n{inp.body}\n\n— {job.get('company', 'Hiring team')} via AutomateJob")


@app.post("/api/alerts/digest")
def alerts_digest():
    """One combined email per subscriber covering all their saved searches. Cron daily."""
    from collections import defaultdict
    groups: dict[str, list[dict]] = defaultdict(list)
    for a in alert_store.all_alerts():
        groups[a["email"]].append(a)
    sent, checked = 0, 0
    for email, items in groups.items():
        checked += 1
        lines: list[str] = []
        for a in items:
            jobs = job_board.list_all(a.get("query", ""), a.get("category", ""), a.get("location", ""))
            fresh = [j for j in jobs if (j.get("created_at", 0) or 0) > (a.get("last_sent", 0) or 0)][:5]
            for j in fresh:
                lines.append(f"- {j['title']} @ {j['company']} ({j.get('location', '')})")
            alert_store.touch_sent(a["id"])
        if not lines:
            continue
        res = alert_store.send_email(
            email, f"Your AutomateJob digest: {len(lines)} new job(s)",
            "Fresh matches across your saved searches:\n\n" + "\n".join(lines[:15]) +
            "\n\nManage: https://automatejob/alerts")
        if res.get("sent") or res.get("mode") == "log":
            sent += 1
    return {"checked": checked, "notifications": sent}


@app.get("/api/board/{job_id}/analytics")
def board_analytics(job_id: int, days: int = 30):
    return job_board.analytics(job_id, days)


class AlertIn(BaseModel):
    email: str = ""
    query: str = ""
    category: str = ""
    location: str = ""
    min_score: int = 0
    resume_text: str = ""
    lang: str = "en"
    phone: str = ""
    channel: str = "email"


@app.post("/api/alerts")
def alerts_create(inp: AlertIn):
    if not alert_store.valid_email(inp.email):
        return {"error": "invalid email"}
    ch = inp.channel if inp.channel in ("email", "sms", "both") else "email"
    if ch in ("sms", "both") and not sms_util.valid_phone(inp.phone):
        return {"error": "invalid phone (10-digit Nepal mobile)"}
    return alert_store.create(inp.email, inp.query, inp.category, inp.location,
                              inp.min_score, inp.resume_text, inp.lang,
                              sms_util.normalize_phone(inp.phone), ch)


@app.get("/api/alerts")
def alerts_list(email: str = ""):
    if not email:
        return {"results": []}
    return {"results": alert_store.list_for(email)}


@app.delete("/api/alerts/{alert_id}")
def alerts_delete(alert_id: int):
    return {"deleted": alert_store.remove(alert_id)}


@app.post("/api/alerts/check")
def alerts_check():
    """Match every saved search against new board jobs; email hits. Cron this hourly."""
    from .matcher import match_resume_to_job  # local import: keeps cold-start light
    sent, checked = 0, 0
    details: list[dict] = []
    for a in alert_store.all_alerts():
        checked += 1
        jobs = job_board.list_all(a.get("query", ""), a.get("category", ""), a.get("location", ""))
        fresh = [j for j in jobs if (j.get("created_at", 0) or 0) > (a.get("last_sent", 0) or 0)]
        hits: list[dict] = []
        for j in fresh:
            blob = f"{j.get('title', '')} {' '.join(j.get('skills', []))} {j.get('description', '')}"
            if a.get("resume_text"):
                m = match_resume_to_job(a["resume_text"], blob)
                if m.score < (a.get("min_score", 0) or 0):
                    continue
                hits.append({"id": j["id"], "title": j["title"], "company": j["company"],
                             "score": m.score, "matched": m.matched_skills[:5]})
            else:
                hits.append({"id": j["id"], "title": j["title"], "company": j["company"]})
        if hits:
            ne = (a.get("lang") or "en") == "ne"
            topic = a.get("query") or a.get("category") or ("your search" if not ne else "तपाईंको खोज")
            if ne:
                lines = [f"- {h['title']} @ {h['company']}" +
                         (f" — म्याच {h.get('score')}/100" if "score" in h else "") +
                         f" (https://automatejob/jobs/{h['id']})" for h in hits[:10]]
                subject = f"'{topic}' का लागि {len(hits)} नयाँ जागिर [AutomateJob]"
                body = ("AutomateJob मा नयाँ मेलहरू:\n\n" + "\n".join(lines) +
                        "\n\nअलर्ट व्यवस्थापन: https://automatejob/alerts")
            else:
                lines = [f"- {h['title']} @ {h['company']}" +
                         (f" — match {h.get('score')}/100" if "score" in h else "") +
                         f" (https://automatejob/jobs/{h['id']})" for h in hits[:10]]
                subject = f"{len(hits)} new job(s) for '{topic}' [AutomateJob]"
                body = ("New matches on AutomateJob:\n\n" + "\n".join(lines) +
                        "\n\nManage alerts: https://automatejob/alerts")
            res = alert_store.send_email(a["email"], subject, body)
            sent += 1 if res.get("sent") or res.get("mode") == "log" else 0
            sms_res: dict | None = None
            if (a.get("channel") or "email") in ("sms", "both") and a.get("phone"):
                top = hits[0]
                if ne:
                    sms_text = (f"AutomateJob: '{topic}' {len(hits)} नयाँ: {top['title']} @ {top['company']}" +
                                (f" म्याच {top.get('score')}/100" if "score" in top else ""))
                else:
                    sms_text = (f"AutomateJob: {len(hits)} new for '{topic}': {top['title']} @ {top['company']}" +
                                (f" match {top.get('score')}/100" if "score" in top else ""))
                sms_res = sms_util.send_sms(a["phone"], sms_text)
            d = {"alert_id": a["id"], "email": a["email"], "hits": len(hits)}
            if sms_res:
                d["sms"] = sms_res.get("mode")
        else:
            d = {"alert_id": a["id"], "email": a["email"], "hits": 0}
        alert_store.touch_sent(a["id"])
        details.append(d)
    return {"checked": checked, "notifications": sent, "details": details}
