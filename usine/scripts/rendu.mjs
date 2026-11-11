// Rend un morceau d'une vidéo (images seules, sans le son). Plusieurs morceaux tournent en parallèle sur GitHub.
// Usage : node scripts/rendu.mjs <id> [--qualite 720|1080] [--part 1 --sur 12] [--images 0-59] [--sortie out]
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const a = process.argv.slice(2);
const opt = (n, d) => (a.includes("--" + n) ? a[a.indexOf("--" + n) + 1] : d);
const id = a[0];
const q = opt("qualite", "720") === "1080" ? "1080" : "720";
const part = +opt("part", 1), sur = +opt("sur", 1);
const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sortie = path.resolve(racine, opt("sortie", "out"));
fs.mkdirSync(sortie, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(racine, "src/index.ts"), publicDir: path.join(racine, "public") });
const chromiumOptions = { gl: opt("gl", "swangle") };
const browserExecutable = process.env.USINE_NAVIGATEUR || undefined; // sur GitHub : navigateur de Remotion, téléchargé tout seul
const compId = q === "1080" ? id : id + "-720";
const composition = await selectComposition({ serveUrl, id: compId, chromiumOptions, browserExecutable });
const total = composition.durationInFrames;
let de, au;
if (opt("images")) [de, au] = opt("images").split("-").map(Number);
else { de = Math.floor(((part - 1) * total) / sur); au = Math.floor((part * total) / sur) - 1; }
if (!(de >= 0 && au >= de && au < total)) throw new Error(`Morceau invalide ${de}-${au} (vidéo de ${total} images)`);
const fichier = path.join(sortie, `part-${String(part).padStart(3, "0")}.mp4`);
console.log(`${compId} : images ${de} à ${au} sur ${total} (morceau ${part}/${sur}), ${os.cpus().length} cœurs.`);
const t0 = Date.now();
let dernier = 0;
await renderMedia({
  composition, serveUrl, browserExecutable, codec: "h264", outputLocation: fichier, frameRange: [de, au], muted: true,
  crf: q === "1080" ? 17 : 19, pixelFormat: "yuv420p", x264Preset: "veryfast", chromiumOptions,
  concurrency: Math.max(1, Math.min(4, os.cpus().length)), timeoutInMilliseconds: 240000,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - dernier >= 20) { dernier = renderedFrames; console.log(`  ${renderedFrames}/${au - de + 1} images, ${((Date.now() - t0) / 1000 / renderedFrames).toFixed(1)} s/image`); } },
});
console.log(`Morceau prêt : ${path.relative(racine, fichier)} en ${Math.round((Date.now() - t0) / 1000)} s.`);
