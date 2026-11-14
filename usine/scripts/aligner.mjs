// Écoute un voix.mp3 déposé à la main (par exemple fabriqué sur le site ElevenLabs) et en déduit le minutage
// mot par mot, pour que les sous-titres tombent au bon moment. Gratuit : tout se passe sur GitHub, sans clé.
// Si src/videos/<id>/script.txt existe, les mots écrits par Aicha sont gardés tels quels (orthographe, accents) :
// l'écoute ne sert qu'à donner l'heure de chaque mot.
// Écrit src/videos/<id>/words.json et src/videos/<id>/voix.sha (empreinte du mp3 : on ne réécoute pas pour rien).
// Usage : node scripts/aligner.mjs <id> [--force] [--modele base|small] [--faux fichier.json]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes("--" + n) ? args[args.indexOf("--" + n) + 1] : d);
const id = args.find((a, i) => !a.startsWith("--") && !["--modele", "--faux"].includes(args[i - 1]));
const stop = (m) => { console.error("ERREUR SOUS-TITRES : " + m); process.exit(1); };
if (!id || !/^[a-z0-9-]+$/.test(id)) stop("donne le nom du dossier de la vidéo (a-z, 0-9, -).");
const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(racine, "src/videos", id);
if (!fs.existsSync(dir)) stop(`le dossier src/videos/${id} n'existe pas.`);

// --- le son déposé : voix.mp3 en priorité, sinon le premier fichier son du dossier ---
const sons = fs.readdirSync(dir).filter((f) => /\.(mp3|m4a|wav|ogg|aac)$/i.test(f) && !/^musique\./i.test(f));
const son = sons.includes("voix.mp3") ? "voix.mp3" : sons[0];
if (!son) stop(`aucun fichier son dans src/videos/${id} (dépose ta voix, par exemple voix.mp3).`);
const fSon = path.join(dir, son);

// --- les mots écrits (facultatif) : ils font foi pour l'orthographe ---
const fScript = path.join(dir, "script.txt");
const script = fs.existsSync(fScript)
  ? fs.readFileSync(fScript, "utf8").split("\n").filter((l) => !l.trim().startsWith("#")).join(" ").replace(/\s+/g, " ").trim()
  : "";

const sha = crypto.createHash("sha256").update(fs.readFileSync(fSon)).update("|" + script).digest("hex").slice(0, 16);
const fSha = path.join(dir, "voix.sha");
if (!args.includes("--force") && fs.existsSync(fSha) && fs.readFileSync(fSha, "utf8").trim() === sha && fs.existsSync(path.join(dir, "words.json"))) {
  console.log("Minutage déjà à jour pour ce son et ce texte : rien à refaire.");
  process.exit(0);
}

/** « L'été, à Paris ! » -> « lete a paris » : pour comparer des mots sans se tromper sur les accents. */
export const nu = (m) => m.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/** Colle les morceaux rendus par l'écoute en mots entiers (l'écoute découpe parfois « in-croy-able »). */
export const motsEcoutes = (captions) => {
  const out = [];
  for (const c of captions) {
    const t = c.text ?? "";
    if (!t.trim()) continue;
    const nouveau = /^\s/.test(t) || out.length === 0;
    if (nouveau) out.push({ w: t.trim(), s: c.startMs / 1000, e: c.endMs / 1000 });
    else { const d = out[out.length - 1]; d.w += t.trim(); d.e = Math.max(d.e, c.endMs / 1000); }
  }
  return out.filter((m) => nu(m.w));
};

/** Plus longue suite de mots communs (texte écrit vs texte entendu). Renvoie les paires [i écrit, j entendu]. */
export const paires = (a, b) => {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push([i, j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return out;
};

/** Donne une heure à chaque mot écrit, à partir des mots entendus. Les mots sans correspondance sont répartis. */
export const recaler = (ecrits, entendus) => {
  if (!ecrits.length) return entendus;
  const p = paires(ecrits.map(nu), entendus.map((x) => nu(x.w)));
  const fin = entendus[entendus.length - 1].e;
  const out = ecrits.map((w) => ({ w, s: null, e: null }));
  p.forEach(([i, j]) => { out[i].s = entendus[j].s; out[i].e = entendus[j].e; });
  // trous : on répartit le temps entre le mot calé d'avant et celui d'après, selon la longueur des mots
  let i = 0;
  while (i < out.length) {
    if (out[i].s !== null) { i++; continue; }
    let j = i; while (j < out.length && out[j].s === null) j++;
    const debut = i > 0 ? out[i - 1].e : 0;
    const terme = j < out.length ? out[j].s : fin;
    const poids = out.slice(i, j).map((x) => Math.max(2, x.w.length));
    const total = poids.reduce((a, b) => a + b, 0);
    let t = debut;
    for (let k = i; k < j; k++) {
      const d = ((terme - debut) * poids[k - i]) / total;
      out[k].s = t; out[k].e = Math.min(terme, t + d * 0.92); t += d;
    }
    i = j;
  }
  return out.map((x) => ({ w: x.w, s: +Math.max(0, x.s).toFixed(3), e: +Math.max(x.s + 0.05, x.e).toFixed(3) }));
};

let entendus;
if (opt("faux")) {
  entendus = motsEcoutes(JSON.parse(fs.readFileSync(opt("faux"), "utf8")));
} else {
  const { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } = await import("@remotion/install-whisper-cpp");
  const modele = opt("modele", "small");
  const outils = process.env.USINE_WHISPER || path.join(racine, ".whisper");
  const version = "1.5.5";
  console.log(`Préparation de l'écoute (modèle ${modele})…`);
  await installWhisperCpp({ to: outils, version });
  await downloadWhisperModel({ model: modele, folder: outils });
  const wav = path.join(racine, "out", "voix-16k.wav");
  fs.mkdirSync(path.dirname(wav), { recursive: true });
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", fSon, "-ar", "16000", "-ac", "1", wav]);
  console.log("Écoute du son…");
  const res = await transcribe({ inputPath: wav, whisperPath: outils, whisperCppVersion: version, model: modele, tokenLevelTimestamps: true, language: "fr", translateToEnglish: false, printOutput: false });
  entendus = motsEcoutes(toCaptions({ whisperCppOutput: res }).captions);
}
if (!entendus.length) stop("rien n'a été entendu dans ce son (fichier vide ou silencieux ?).");

const ecrits = script ? script.split(" ").filter((w) => nu(w)) : [];
const mots = ecrits.length ? recaler(ecrits, entendus) : entendus.map((m) => ({ w: m.w, s: +m.s.toFixed(3), e: +m.e.toFixed(3) }));
fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(mots));
fs.writeFileSync(fSha, sha + "\n");

const fin = mots[mots.length - 1].e;
if (ecrits.length) {
  const cales = paires(ecrits.map(nu), entendus.map((x) => nu(x.w))).length;
  const part = Math.round((cales / ecrits.length) * 100);
  console.log(`Minutage prêt : ${mots.length} mots, ${fin.toFixed(2)} s. ${part} % des mots écrits ont été reconnus dans le son.`);
  if (part < 60) console.log("ATTENTION : peu de mots reconnus. Vérifie que le son correspond bien au script.txt (sinon les sous-titres seront décalés).");
} else {
  console.log(`Minutage prêt : ${mots.length} mots, ${fin.toFixed(2)} s (texte pris tel qu'entendu, pas de script.txt).`);
}
console.log(`Durée conseillée de la vidéo : ${Math.ceil((fin + 1.2) * 30)} images.`);
