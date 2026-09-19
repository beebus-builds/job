"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, getActiveResume } from "../lib/api";

type User = {
  id: number; email: string; name: string; headline: string;
  location: string; bio: string; skills: string[]; slug: string;
  email_verified?: number; avatar?: string;
};

const Ctx = createContext<{
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  google: (id_token: string) => Promise<string | null>;
  redeem: (token: string) => Promise<string | null>;
  logout: () => void; refresh: () => Promise<void>;
}>({
  user: null, loading: true,
  login: async () => "noop", register: async () => "noop",
  google: async () => "noop", redeem: async () => "noop",
  logout: () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const u = await api.me();
      setUser(u.error ? null : u);
    } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const adoptGuestResume = async () => {
    // first login ever: carry the guest's local resume into the new account
    try {
      const mine = await api.resumes();
      const local = getActiveResume();
      if ((!mine.results || !mine.results.length) && local && local.length > 50) {
        await api.addResume("My Resume", local);
      }
    } catch { /* offline */ }
  };
  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    if (r.error) return r.error;
    setToken(r.token); setUser(r.user);
    adoptGuestResume();
    return null;
  };
  const register = async (email: string, password: string, name: string) => {
    const ref = typeof window !== "undefined" ? localStorage.getItem("aj_ref") ?? "" : "";
    const r = await api.register(email, password, name, ref);
    if (r.error) return r.error;
    if (typeof window !== "undefined") localStorage.removeItem("aj_ref");
    setToken(r.token); setUser(r.user);
    adoptGuestResume();
    return null;
  };
  const logout = () => { setToken(""); setUser(null); };
  const google = async (id_token: string) => {
    const r = await api.google(id_token);
    if (r.error) return r.error;
    setToken(r.token); setUser(r.user);
    adoptGuestResume();
    return null;
  };
  const redeem = async (token: string) => {
    const r = await api.magicRedeem(token);
    if (r.error) return r.error;
    setToken(r.token); setUser(r.user);
    adoptGuestResume();
    return null;
  };

  return <Ctx.Provider value={{ user, loading, login, register, google, redeem, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function initials(name: string, email: string) {
  const n = (name || "").trim().split(/\s+/).filter(Boolean);
  if (n.length >= 2) return (n[0][0] + n[1][0]).toUpperCase();
  if (n.length === 1) return n[0].slice(0, 2).toUpperCase();
  return (email || "AJ").slice(0, 2).toUpperCase();
}
