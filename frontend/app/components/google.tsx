"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useAuth } from "./auth";

declare global {
  interface Window {
    google?: any;
  }
}

const CID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function GoogleButton() {
  const { t } = useLang();
  const { google } = useAuth();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CID || !ref.current) return;
    if (window.google) return render();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
    function render() {
      window.google.accounts.id.initialize({
        client_id: CID,
        callback: async (res: any) => {
          const err = await google(res.credential);
          if (!err) router.push("/app");
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline", size: "large", width: 320, text: "continue_with",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CID) return null;
  return (
    <div>
      <div className="my-3 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />{t("auth.or")}<span className="h-px flex-1 bg-slate-200" />
      </div>
      <div ref={ref} className="flex justify-center" />
      <noscript>{t("auth.google")}</noscript>
    </div>
  );
}
