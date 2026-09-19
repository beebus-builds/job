"use client";

export const THEME_GRAD: Record<string, string> = {
  indigo: "from-indigo-600 via-violet-600 to-purple-600",
  emerald: "from-emerald-600 via-teal-600 to-cyan-600",
  sky: "from-sky-600 via-blue-600 to-indigo-600",
  amber: "from-amber-500 via-orange-500 to-rose-500",
  rose: "from-rose-600 via-pink-600 to-fuchsia-600",
  violet: "from-violet-600 via-purple-600 to-indigo-600",
};

export function grad(theme?: string) {
  return THEME_GRAD[theme ?? ""] ?? THEME_GRAD.indigo;
}
