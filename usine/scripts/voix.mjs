// Voix off d'une vidéo avec ElevenLabs (route « with-timestamps » : le son + l'instant exact de chaque mot).
// Lit   src/videos/<id>/script.txt  (le texte dit par la voix ; les lignes qui commencent par # sont ignorées)
//       src/videos/<id>/voix.json   (facultatif : { "voix", "modele", "stabilite", "ressemblance", "style", "vitesse" })
// Écrit src/videos/<id>/voix.mp3, words.json ([{w, s, e}] en secondes) et voix.sha (pour ne pas repayer une voix inchangée).
// Clés : secrets GitHub ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID. Jamais dans le code.
// Usage : node scripts/voix.mjs <id> [--force] [--simulation fichier.json]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parler, corpsVoix, propre } from "./eleven.mjs";

const args = process.argv.slice(2);
const id = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--simulation");
const force = args.includes("--force");
const simu = args.includes("--simulation") ? args[args.indexOf("--simulation") + 1] : null;
const stop = (m) => { console.error("ERREUR VOIX : " + m); process.exit(1); };
if (!id || !/^[a-z0-9-]+$/.test(id)) stop("donne le nom du dossier de la vidéo (a-z, 0-9, -).");
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../src/videos", id);
const fScript = path.join(dir, "script.txt");
if (!fs.existsSync(fScript)) stop(`il manque ${path.relative(process.cwd(), fScript)}`);

const texte = fs.readFileSync(fScript, "utf8").split("\n").filter((l) => !l.trim().startsWith("#")).join(" ").replace(/\s+/g, " ").trim();
if (!texte) stop("script.txt est vide.");
if (texte.length > 2500) stop(`script trop long (${texte.length} caractères, maximum 2500 : un Short fait 900 à 1100).`);
const reg = fs.existsSync(path.join(dir, "voix.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "voix.json"), "utf8")) : {};
// La vidéo peut imposer sa voix (voix.json) ; sinon c'est la voix du secret.
const voiceId = propre(reg.voix || process.env.ELEVENLABS_VOICE_ID);
const sha = crypto.createHash("sha256").update(JSON.stringify(corpsVoix(texte, reg)) + "|" + voiceId).digest("hex").slice(0, 16);
const fSha = path.join(dir, "voix.sha");
if (!force && !simu && fs.existsSync(fSha) && fs.readFileSync(fSha, "utf8").trim() === sha && fs.existsSync(path.join(dir, "voix.mp3"))) {
  console.log("Voix déjà à jour pour ce texte : rien à refaire (0 caractère dépensé).");
  process.exit(0);
}
const key = propre(process.env.ELEVENLABS_API_KEY);
if (!simu) {
  if (!key) stop("le secret ELEVENLABS_API_KEY est absent (GitHub : Settings > Secrets and variables > Actions).");
  if (!/^[A-Za-z0-9]{15,40}$/.test(voiceId)) stop(voiceId ? "l'identifiant de voix n'a pas la bonne forme : UN SEUL code d'environ 20 lettres et chiffres, sans espace ni retour à la ligne." : "le secret ELEVENLABS_VOICE_ID est absent.");
  console.log(`Demande à ElevenLabs : ${texte.length} caractères, modèle ${corpsVoix(texte, reg).model_id}.`);
}
let out;
try { out = await parler({ texte, voiceId, key, reglages: reg, simulation: simu ? JSON.parse(fs.readFileSync(simu, "utf8")) : null }); }
catch (e) { stop(e.message); }
fs.writeFileSync(path.join(dir, "voix.mp3"), out.mp3);
fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(out.words));
if (!simu) fs.writeFileSync(fSha, sha + "\n");
const fin = out.words[out.words.length - 1].e;
console.log(`Voix prête : ${out.words.length} mots, ${fin.toFixed(2)} s (${Math.round((out.words.length / fin) * 60)} mots/min). Durée conseillée de la vidéo : ${Math.ceil((fin + 1.2) * 30)} images.`);
