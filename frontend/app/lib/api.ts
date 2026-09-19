export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("aj_token") ?? "";
}
export function setToken(t: string) {
  if (typeof window !== "undefined") {
    if (t) localStorage.setItem("aj_token", t);
    else localStorage.removeItem("aj_token");
  }
}

async function req(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", ...(init?.headers as Record<string, string> ?? {}),
  };
  const tok = getToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
  return r.json();
}

export const api = {
  jobs: (params: { q?: string; location?: string; remote_only?: boolean; source?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.location) sp.set("location", params.location);
    if (params.remote_only) sp.set("remote_only", "true");
    if (params.source) sp.set("source", params.source);
    return req(`/api/jobs?${sp.toString()}`);
  },
  match: (resume_text: string, job_description: string, lang = "en") =>
    req("/api/match", { method: "POST", body: JSON.stringify({ resume_text, job_description, lang }) }),
  rank: (resume_text: string, jobs: object[], lang = "en") =>
    req("/api/rank", { method: "POST", body: JSON.stringify({ resume_text, jobs, lang }) }),
  cover: (payload: object) =>
    req("/api/cover-letter", { method: "POST", body: JSON.stringify(payload) }),
  genPost: (payload: object) =>
    req("/api/job-post/generate", { method: "POST", body: JSON.stringify(payload) }),
  scorePost: (posting_text: string) =>
    req("/api/job-post/score", { method: "POST", body: JSON.stringify({ posting_text }) }),
  apps: () => req("/api/applications"),
  stats: () => req("/api/applications/stats"),
  addApp: (payload: object) =>
    req("/api/applications", { method: "POST", body: JSON.stringify(payload) }),
  patchApp: (id: number, patch: object) =>
    req(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  delApp: (id: number) => req(`/api/applications/${id}`, { method: "DELETE" }),
  resumes: () => req("/api/resumes"),
  addResume: (name: string, text: string) =>
    req("/api/resumes", { method: "POST", body: JSON.stringify({ name, text }) }),
  board: (params: { q?: string; category?: string; location?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.location) sp.set("location", params.location);
    return req(`/api/board?${sp.toString()}`);
  },
  boardGet: (id: string | number) => req(`/api/board/${id}`),
  boardPost: (payload: object) =>
    req("/api/board", { method: "POST", body: JSON.stringify(payload) }),
  boardDelete: (id: number) => req(`/api/board/${id}`, { method: "DELETE" }),
  boardApply: (id: number) => req(`/api/board/${id}/apply`, { method: "POST" }),
  applyFull: (id: number, payload: object) =>
    req(`/api/board/${id}/apply-full`, { method: "POST", body: JSON.stringify(payload) }),
  applicants: (jobId: number) => req(`/api/board/${jobId}/applicants`),
  applicantGet: (id: number) => req(`/api/applicants/${id}`),
  applicantPatch: (id: number, patch: object) =>
    req(`/api/applicants/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  applicantDel: (id: number) => req(`/api/applicants/${id}`, { method: "DELETE" }),
  myApplications: (email: string) => req(`/api/my-applications?email=${encodeURIComponent(email)}`),
  reportJob: (id: number, payload: object) =>
    req(`/api/board/${id}/report`, { method: "POST", body: JSON.stringify(payload) }),
  adminReports: (token: string) =>
    req("/api/admin/reports", { headers: { "X-Admin-Token": token } }),
  adminDismiss: (id: number, token: string) =>
    req(`/api/admin/reports/${id}`, { method: "DELETE", headers: { "X-Admin-Token": token } }),
  adminDeletePost: (id: number, token: string) =>
    req(`/api/board/${id}`, { method: "DELETE", headers: { "X-Admin-Token": token } }),
  boardSummary: () => req("/api/board/analytics/summary"),
  boardAnalytics: (id: number, days = 14) => req(`/api/board/${id}/analytics?days=${days}`),
  alertCreate: (payload: object) =>
    req("/api/alerts", { method: "POST", body: JSON.stringify(payload) }),
  alertList: (email: string) => req(`/api/alerts?email=${encodeURIComponent(email)}`),
  alertDelete: (id: number) => req(`/api/alerts/${id}`, { method: "DELETE" }),
  register: (email: string, password: string, name: string, ref = "") =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name, ref }) }),
  login: (email: string, password: string) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/api/auth/me"),
  forgot: (email: string) =>
    req("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPw: (token: string, password: string) =>
    req("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  google: (id_token: string) =>
    req("/api/auth/google", { method: "POST", body: JSON.stringify({ id_token }) }),
  magic: (email: string) =>
    req("/api/auth/magic", { method: "POST", body: JSON.stringify({ email }) }),
  magicRedeem: (token: string) =>
    req("/api/auth/magic/redeem", { method: "POST", body: JSON.stringify({ token }) }),
  featurePost: (id: number, days = 7) =>
    req(`/api/board/${id}/feature`, { method: "POST", body: JSON.stringify({ days }) }),
  messageApplicant: (id: number, payload: object) =>
    req(`/api/applicants/${id}/message`, { method: "POST", body: JSON.stringify(payload) }),
  billingConfig: () => req("/api/billing/config"),
  esewaInitiate: (job_id: number, days = 7) =>
    req("/api/billing/esewa/initiate", { method: "POST", body: JSON.stringify({ job_id, days }) }),
  adminFeatured: (token: string) =>
    req("/api/admin/featured", { headers: { "X-Admin-Token": token } }),
  adminMailStatus: (token: string) =>
    req("/api/admin/mail-status", { headers: { "X-Admin-Token": token } }),
  adminTestEmail: (to: string, token: string) =>
    req("/api/admin/test-email", { method: "POST", body: JSON.stringify({ to }), headers: { "X-Admin-Token": token } }),
  adminFeatureDecide: (id: number, approve: boolean, token: string) =>
    req(`/api/admin/featured/${id}`, { method: "POST", body: JSON.stringify({ approve }), headers: { "X-Admin-Token": token } }),
  socialWeekly: () => req("/api/social/weekly"),
  saveProfile: (patch: object) =>
    req("/api/auth/profile", { method: "PATCH", body: JSON.stringify(patch) }),
  publicUser: (slug: string) => req(`/api/users/by-slug/${encodeURIComponent(slug)}`),
  companyOwn: () => req("/api/company-site"),
  companySave: (payload: object) =>
    req("/api/company-site", { method: "PUT", body: JSON.stringify(payload) }),
  companyList: () => req("/api/company-sites"),
  companyOne: (slug: string) => req(`/api/company-site/by-slug/${encodeURIComponent(slug)}`),
  projList: () => req("/api/portfolio/projects"),
  projAdd: (payload: object) =>
    req("/api/portfolio/projects", { method: "POST", body: JSON.stringify(payload) }),
  projPatch: (id: number, patch: object) =>
    req(`/api/portfolio/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  projDel: (id: number) => req(`/api/portfolio/projects/${id}`, { method: "DELETE" }),
  expList: () => req("/api/portfolio/experience"),
  expAdd: (payload: object) =>
    req("/api/portfolio/experience", { method: "POST", body: JSON.stringify(payload) }),
  expPatch: (id: number, patch: object) =>
    req(`/api/portfolio/experience/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  expDel: (id: number) => req(`/api/portfolio/experience/${id}`, { method: "DELETE" }),
  portfolioOne: (slug: string) => req(`/api/portfolio/by-slug/${encodeURIComponent(slug)}`),
  cvGet: () => req("/api/cv"),
  cvSave: (payload: object) =>
    req("/api/cv", { method: "PUT", body: JSON.stringify(payload) }),
  referralMine: () => req("/api/referral/mine"),
  referralSender: (code: string) => req(`/api/referral/by-code/${encodeURIComponent(code)}`),
  referralBoard: () => req("/api/referral/leaderboard"),
  verifySend: () => req("/api/auth/verify/send", { method: "POST" }),
  deleteAccount: () => req("/api/auth/account", { method: "DELETE", body: JSON.stringify({}) }),
  members: () => req("/api/company-site/members"),
  memberAdd: (email: string, role = "manager") =>
    req("/api/company-site/members", { method: "POST", body: JSON.stringify({ email, role }) }),
  memberDrop: (user_id: number) => req(`/api/company-site/members/${user_id}`, { method: "DELETE" }),
  pushVapid: () => req("/api/push/vapid"),
  pushSub: (endpoint: string, keys: object) =>
    req("/api/push/subscribe", { method: "POST", body: JSON.stringify({ endpoint, keys }) }),
  endorse: (slug: string, skill: string, by_email: string) =>
    req(`/api/portfolio/by-slug/${encodeURIComponent(slug)}/endorse`, { method: "POST", body: JSON.stringify({ skill, by_email }) }),
  ivQuestions: (job_description: string, lang = "en") =>
    req("/api/interview/questions", { method: "POST", body: JSON.stringify({ job_description, lang }) }),
  ivFeedback: (question: string, answer: string, lang = "en") =>
    req("/api/interview/feedback", { method: "POST", body: JSON.stringify({ question, answer, lang }) }),
  salary: (params: { q?: string; category?: string; location?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.location) sp.set("location", params.location);
    return req(`/api/salary/insights?${sp.toString()}`);
  },
};

export async function parseResume(file: File): Promise<{ resume_text?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API_BASE}/api/parse-resume`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Resume parse failed");
  return r.json();
}

// Active resume persisted locally for instant reuse across tabs
export function getActiveResume(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("aj_resume") ?? "";
}
export function setActiveResume(t: string) {
  if (typeof window !== "undefined") localStorage.setItem("aj_resume", t);
}
