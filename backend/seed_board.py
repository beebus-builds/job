"""Seed the public employer board with Nepal-flavored demo postings."""
from app import board as job_board

DEMOS = [
    {"title": "Frontend Developer (React)", "company": "Sajilo Tech", "location": "Kathmandu · Hybrid",
     "work_type": "Full-time", "category": "Engineering", "salary": "Rs. 80k–120k/month",
     "description": "Build React/Next.js features for fintech clients. You will own UI slices end to end, write Jest tests, and ship via GitHub Actions.\n\nResponsibilities:\n- Build responsive React/Next.js features with Tailwind\n- Integrate REST APIs and handle loading/error states\n- Write Jest tests and review PRs\n\nRequirements:\n- 1+ years React or strong portfolio projects\n- TypeScript, Git, basic SEO/page-speed awareness",
     "skills": ["React", "TypeScript", "Tailwind CSS", "REST APIs", "Jest", "Git"],
     "contact_email": "hiring@sajilotech.example"},
    {"title": "Backend Engineer (Python)", "company": "Himal Data", "location": "Lalitpur · On-site",
     "work_type": "Full-time", "category": "Engineering", "salary": "Rs. 120k–180k/month",
     "description": "Design FastAPI services on PostgreSQL, Docker deploys on AWS. Own schemas, queues, and reliability.\n\nRequirements:\n- 2+ years Python, FastAPI or Django\n- PostgreSQL, Docker, pytest, CI/CD",
     "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "PyTest"],
     "contact_email": "jobs@himaldata.example"},
    {"title": "Digital Marketing Executive", "company": "Everest Mart", "location": "Kathmandu · On-site",
     "work_type": "Full-time", "category": "Marketing", "salary": "Rs. 50k–70k/month",
     "description": "Run SEO + social campaigns for an e-commerce brand. HubSpot CRM, weekly analytics reporting.\n\nRequirements:\n- SEO fundamentals, content calendar ownership\n- Strong written English and communication",
     "skills": ["SEO", "HubSpot", "Communication", "Excel"],
     "contact_email": "hr@everestmart.example"},
    {"title": "UI/UX Designer", "company": "Yeti Studio", "location": "Remote (Nepal)",
     "work_type": "Contract", "category": "Design", "salary": "Rs. 70k–100k/month",
     "description": "Figma prototypes and design system for SaaS clients. Portfolio required.\n\nRequirements:\n- Figma, UI/UX, HTML/CSS handoff\n- Portfolio with 3+ shipped screens",
     "skills": ["Figma", "UI/UX", "HTML", "CSS"],
     "contact_email": "hello@yetistudio.example"},
    {"title": "DevOps Intern", "company": "Cloud Himalaya", "location": "Kathmandu · Hybrid",
     "work_type": "Internship", "category": "Internship", "salary": "Rs. 25k stipend",
     "description": "Learn Linux admin, Docker, AWS deploys and CI/CD with a mentor. Stipend + full-time conversion for strong performers.",
     "skills": ["Linux", "Docker", "AWS", "Git", "CI/CD"],
     "contact_email": "interns@cloudhimalaya.example"},
]

if __name__ == "__main__":
    for d in DEMOS:
        print(job_board.create(d)["id"], d["title"])
