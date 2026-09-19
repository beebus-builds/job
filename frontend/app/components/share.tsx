"use client";

/** Draw a branded 1200x630 score card on canvas, download + native share. No deps. */
export function drawScoreCard(score: number, title: string, company: string): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 630;
  const g = cv.getContext("2d")!;

  const bg = g.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, "#4f46e5"); bg.addColorStop(1, "#7c3aed");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1200, 630);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.beginPath(); g.arc(1050, 80, 260, 0, 7); g.fill();
  g.beginPath(); g.arc(120, 560, 200, 0, 7); g.fill();

  g.fillStyle = "#fff";
  g.font = "800 44px system-ui, sans-serif";
  g.fillText("⚡ AutomateJob", 70, 110);
  g.font = "400 30px system-ui, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillText("My AI match score", 70, 160);

  g.fillStyle = "#fff";
  g.font = "900 200px system-ui, sans-serif";
  g.fillText(`${score}`, 70, 380);
  g.font = "700 72px system-ui, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.fillText("/100", 330, 380);

  g.fillStyle = "#fff";
  g.font = "700 46px system-ui, sans-serif";
  const lines = wrap(g, `${title} @ ${company}`, 1000);
  lines.slice(0, 2).forEach((ln, i) => g.fillText(ln, 70, 460 + i * 58));

  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "400 28px system-ui, sans-serif";
  g.fillText("Find your fit at AutomateJob", 70, 580);
  return cv;
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function shareScoreImage(score: number, title: string, company: string, url: string) {
  const cv = drawScoreCard(score, title, company);
  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
  const text = `I scored ${score}/100 for ${title} @ ${company} on AutomateJob ${url}`;
  const files = blob ? [new File([blob], "match-score.png", { type: "image/png" })] : [];
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      const data: any = { title: "My AutomateJob match score", text, url };
      if (files.length && (navigator as any).canShare?.({ files })) data.files = files;
      await (navigator as any).share(data);
      return "shared";
    } catch { /* user cancelled */ return "cancelled"; }
  }
  if (blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "automatejob-score.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return "downloaded";
  }
  return "none";
}

/** Plain share links (FB / X / LinkedIn / WhatsApp / Viber) — zero deps. */
export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { name: "Viber", href: `viber://forward?text=${t}%20${u}` },
  ];
}
