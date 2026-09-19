# AutomateJob ⚡

Modern job-search + job-posting automation with **your own AI** (custom TF-IDF + skill-ontology matcher — no paid LLM needed).

## Stack
- **Backend:** Python FastAPI (`backend/`) — matching engine, cover-letter + job-post generators, free job aggregator (Remotive + Arbeitnow), SQLite tracker, JWT accounts
- **Frontend:** Next.js + Tailwind (`frontend/`) — landing (`/`) · AI dashboard (`/app`) · public SEO board (`/jobs`, `/jobs/[id]`, `/jobs-in/*`, `/category/*`) · companies (`/companies`, `/c/[slug]`, `/company`) · employer ATS + analytics + PDF reports (`/employers`) · AI-scored alerts (`/alerts`) · interview prep (`/interview`) · salaries (`/salary`) · CV builder (`/cv`) · auth + profiles + portfolios + referrals (`/login`, `/profile`, `/u/[slug]`, `/r/*`) · full NE/EN toggle · sitemap + robots

## Auth
Set a real secret in production: `JWT_SECRET=...` (dev default is insecure). Accounts own their resumes + tracker; guests get isolated guest-mode data.
- Password reset: `FRONTEND_URL=https://your-site` so emailed links point at `/reset`. Works over existing SMTP config.
- Google login: backend `GOOGLE_CLIENT_ID=...` + frontend `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` (same value, from Google Cloud → Credentials → OAuth client). Button hides itself until configured.

## Quickstart

### 1. Backend
```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Health: http://localhost:8000/health · Docs: http://localhost:8000/docs

### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. API base override: `NEXT_PUBLIC_API_BASE=http://localhost:8000`.

## Custom AI engine (`backend/app/matcher.py`)
1. Tokenize + stopword removal + light stemming
2. Skill extraction via `skills.py` ontology (~80 skills)
3. On-the-fly TF-IDF + cosine similarity
4. Blended score = `0.55·cosine + 0.35·skill_overlap + 0.10·keyword_bonus`, scaled to 0–100
5. Gaps + tailored suggestions

No model downloads, no API keys, fully explainable.

## Free job sources
- Remotive `https://remotive.com/api/remote-jobs` (no key)
- Arbeitnow `https://www.arbeitnow.com/api/job-board-api` (no key)
- Local seed fallback + 10-min cache so the UI always works offline.

## Alerts: email + SMS
Cron `POST /api/alerts/check` hourly (instant per-search mails) and `POST /api/alerts/digest` daily (one combined digest per subscriber).

## Email via Gmail (2 minutes)
1. Google Account → **Security** → turn on **2-Step Verification**.
2. Security → search **"App passwords"** → create one for Mail → copy the 16-letter code.
3. `.env`: `SMTP_USER=you@gmail.com` + `SMTP_PASS=<that code>` — host/port auto-fill (`smtp.gmail.com:587`). Never use your normal Gmail password (Google rejects it).
4. Verify: open `/admin` → Email delivery panel → **Send test email**. Status line shows provider/user/password at a glance.

## Production run
```powershell
cp .env.example .env   # then fill secrets!
docker compose up --build
```
- Data lives in the `aj-data` volume (`DB_PATH=/app/data/tracker.db`); nightly `python backend/backup.py` keeps 7 copies.
- Watch backend logs on boot: `[security]` lines flag dev-default secrets.
- eSewa: set `ESEWA_MERCHANT` + `ESEWA_SECRET` (+ `ESEWA_MODE=live` when ready) and the Boost flow charges Rs. `FEATURE_PRICE_NPR` per 7 days; without creds it stays manual-approval.
- Crons: alerts check hourly, digest daily, backup nightly.
```powershell
# real email
$env:SMTP_HOST="smtp.gmail.com"; $env:SMTP_USER="you@gmail.com"; $env:SMTP_PASS="..."; $env:SMTP_FROM="you@gmail.com"
# real SMS via Sparrow (Nepal) — or generic webhook
$env:SPARROW_TOKEN="..."; $env:SPARROW_FROM="InfoSms"
# $env:SMS_WEBHOOK_URL="https://..."; $env:SMS_WEBHOOK_TOKEN="..."
```

## Roadmap
- [ ] Auto-tailor resume bullets per posting
- [ ] LinkedIn/Indeed adapters (careful: ToS — prefer official APIs)
- [ ] Email alerts + interview prep questions
- [ ] Auth + Postgres for multi-user deploy
