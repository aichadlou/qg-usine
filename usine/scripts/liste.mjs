// Writes src/videos/liste.ts: one entry per folder of src/videos that has an index.tsx.
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../src/videos");
const ids = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "index.tsx"))).sort();
const ok = (d) => /^[a-z0-9-]+$/.test(d);
ids.forEach((d) => { if (!ok(d)) throw new Error(`Nom de dossier invalide : ${d} (seulement a-z, 0-9 et -)`); });
const name = (d) => "v_" + d.replace(/-/g, "_");
const src = `// Généré par scripts/liste.mjs : ne pas modifier à la main.
import React from "react";
${ids.map((d) => `import { video as ${name(d)} } from "./${d}";`).join("\n")}
export type Video = { id: string; frames: number; Scene: React.FC; words: { w: string; s: number; e: number }[] };
export const VIDEOS: Video[] = [${ids.map(name).join(", ")}] as Video[];
`;
fs.writeFileSync(path.join(dir, "liste.ts"), src);
console.log("Vidéos :", ids.join(", "));
