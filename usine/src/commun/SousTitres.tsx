// Viral-style French subtitles: 1 to 3 words at a time, big rounded bold letters, white with a thick dark outline,
// the word being spoken in yellow with a small pop. Timed from words.json ({w, s, e} in seconds, from ElevenLabs).
// Everything is sized from the output height, so 720x1280 and 1080x1920 look the same.
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { continueRender, delayRender, staticFile } from "remotion";

// Police rangée dans le dépôt (public/fonts) : aucun téléchargement pendant le rendu.
const fontFamily = "MontserratUsine";
const POLICES: [string, string][] = [
  ["montserrat-latin-900-normal.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["montserrat-latin-ext-900-normal.woff2", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"],
];
if (typeof document !== "undefined") {
  const h = delayRender("police des sous-titres");
  Promise.all(POLICES.map(([f, r]) => new FontFace(fontFamily, `url(${staticFile("fonts/" + f)}) format("woff2")`, { weight: "900", unicodeRange: r }).load()))
    .then((fs) => { fs.forEach((f) => (document as any).fonts.add(f)); continueRender(h); })
    .catch(() => continueRender(h));
}

export type Mot = { w: string; s: number; e: number };
type Groupe = { mots: Mot[]; s: number; e: number };

const groupes = (words: Mot[]): Groupe[] => {
  const out: Groupe[] = [];
  let cur: Mot[] = [];
  const flush = () => { if (cur.length) { out.push({ mots: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
  words.forEach((m, i) => {
    cur.push(m);
    const len = cur.reduce((n, x) => n + x.w.length, 0);
    const next = words[i + 1];
    const pause = next ? next.s - m.e > 0.28 : true;
    if (/[.!?…,;:]$/.test(m.w) || cur.length >= 3 || len > 16 || pause) flush();
  });
  flush();
  // each group stays until the next one starts (no flicker in short gaps)
  out.forEach((g, i) => { const n = out[i + 1]; g.e = n ? Math.min(n.s, g.e + 0.6) : g.e + 0.6; });
  return out;
};

export const SousTitres: React.FC<{ words: Mot[] }> = ({ words }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = f / fps;
  const gs = useMemo(() => groupes(words), [words]);
  const g = gs.find((x) => t >= x.s - 0.05 && t < x.e);
  if (!g) return null;
  const k = height / 1920;
  const long = Math.max(...g.mots.map((m) => m.w.length));
  const taille = 92 * k * Math.min(1, 12 / long); // un mot très long rétrécit au lieu de se couper
  const appear = interpolate(t, [g.s - 0.05, g.s + 0.08], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 560 * k }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${10 * k}px ${22 * k}px`, maxWidth: 940 * k, transform: `scale(${appear})` }}>
        {g.mots.map((m, i) => {
          const on = t >= m.s - 0.03 && t < m.e + 0.02;
          return (
            <span key={i} style={{
              fontFamily: `${fontFamily}, Arial Black, sans-serif`, fontWeight: 900, fontSize: taille, whiteSpace: "nowrap", lineHeight: 1.05, textTransform: "uppercase", letterSpacing: 1 * k,
              color: on ? "#FFD23F" : "#FFFFFF", WebkitTextStroke: `${14 * k}px #120d16`, paintOrder: "stroke fill",
              textShadow: `0 ${8 * k}px ${14 * k}px rgba(0,0,0,.45)`, display: "inline-block",
              transform: on ? "scale(1.08) rotate(-1.5deg)" : "none",
            }}>{m.w.replace(/[,;:]$/, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
