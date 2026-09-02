# jobOS

**The operating system for getting hired.**

jobOS is a two-sided hiring automation platform for job seekers and employers.

## Current product surface

- AI-ranked job marketplace
- Candidate dashboard and application tracker
- Candidate profile workspace
- Employer hiring dashboard
- AI-assisted job creation
- Hiring pipeline and talent radar
- Career automation workflows
- Deterministic job matching API
- Candidate screening API
- Jobs and applications API endpoints

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Lucide React

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## API

- `GET /api/jobs?q=react` — search jobs
- `POST /api/match` — calculate candidate/job fit
- `GET /api/applications` — application data
- `POST /api/applications` — create an application payload
- `POST /api/screen` — screen a candidate against a job description

The current data layer is intentionally lightweight so the product can be demoed without external credentials. PostgreSQL, authentication, persistent workflows and production AI providers are the next backend layer.

## Product principle

Automate repeated work, keep important decisions explainable, and keep humans in control of consequential hiring decisions.
