// Voix off d'une vidéo avec ElevenLabs (route « with-timestamps » : le son + l'instant exact de chaque lettre).
// Lit   src/videos/<id>/script.txt  (le texte dit par la voix ; les lignes qui commencent par # sont ignorées)
//       src/videos/<id>/voix.json   (facultatif : { "modele", "stabilite", "ressemblance", "style", "vitesse" })
// Écrit src/videos/<id>/voix.mp3, words.json ([{w, s, e}] en secondes) et voix.sha (pour ne pas repayer une voix inchangée).
// Clés : variables d'environnement ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID (secrets GitHub). Jamais dans le code.
// Usage : node scripts/voix.mjs <id> [--force] [--simulation fichier.json]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--simulation");
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
const voiceId = process.env.ELEVENLABS_VOICE_ID || "";
const corps = {
  text: texte,
  model_id: reg.modele || "eleven_multilingual_v2",
  language_code: undefined,
  voice_settings: { stability: reg.stabilite ?? 0.45, similarity_boost: reg.ressemblance ?? 0.8, style: reg.style ?? 0.3, use_speaker_boost: true, speed: reg.vitesse ?? 1.08 },
};
const sha = crypto.createHash("sha256").update(JSON.stringify(corps) + "|" + voiceId).digest("hex").slice(0, 16);
const fSha = path.join(dir, "voix.sha");
if (!force && !simu && fs.existsSync(fSha) && fs.readFileSync(fSha, "utf8").trim() === sha && fs.existsSync(path.join(dir, "voix.mp3"))) {
  console.log("Voix déjà à jour pour ce texte : rien à refaire (0 caractère dépensé).");
  process.exit(0);
}

// lettres minutées -> mots minutés
export const mots = (al) => {
  const out = [];
  let w = "", s = 0, e = 0;
  const flush = () => { w = w.replace(/[«»"“”]/g, ""); if (w) out.push({ w, s: +s.toFixed(3), e: +e.toFixed(3) }); w = ""; };
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) return flush();
    if (!w) s = al.character_start_times_seconds[i];
    w += c; e = al.character_end_times_seconds[i];
  });
  flush();
  // la ponctuation isolée (« ? », « ! », « : » à la française) se colle au mot d'avant
  return out.reduce((acc, m) => { if (/^[?!:;»…—-]+$/.test(m.w) && acc.length) { acc[acc.length - 1].w += m.w === "—" || m.w === "-" ? "" : m.w; acc[acc.length - 1].e = m.e; } else if (m.w !== "«") acc.push(m); return acc; }, []);
};

let data;
if (simu) data = JSON.parse(fs.readFileSync(simu, "utf8"));
else {
  const key = process.env.ELEVENLABS_API_KEY || "";
  if (!key) stop("le secret ELEVENLABS_API_KEY est absent (GitHub : Settings > Secrets and variables > Actions).");
  if (!voiceId) stop("le secret ELEVENLABS_VOICE_ID est absent (GitHub : Settings > Secrets and variables > Actions).");
  console.log(`Demande à ElevenLabs : ${texte.length} caractères, modèle ${corps.model_id}.`);
  let r, essai = 0;
  for (;;) {
    r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify(corps),
    });
    if ((r.status === 429 || r.status >= 500) && essai++ < 3) { await new Promise((ok) => setTimeout(ok, 8000 * essai)); continue; }
    break;
  }
  if (!r.ok) {
    const t = (await r.text()).slice(0, 600).replaceAll(key, "***");
    const aide = r.status === 401 ? "Clé refusée : vérifie le secret ELEVENLABS_API_KEY (et que la clé a le droit « Text to Speech »)."
      : /quota/i.test(t) ? "Plus assez de caractères ElevenLabs ce mois-ci."
      : /voice/i.test(t) && /(not.?found|free|subscription|library)/i.test(t) ? "Cette voix n'est pas utilisable avec ton abonnement : choisis une voix de base (« Default ») et mets son identifiant dans ELEVENLABS_VOICE_ID."
      : "Voir le détail ci-dessous.";
    stop(`ElevenLabs a répondu ${r.status}. ${aide}\n${t}`);
  }
  data = await r.json();
}
const al = data.normalized_alignment?.characters?.length && !data.alignment ? data.normalized_alignment : data.alignment;
if (!data.audio_base64 || !al) stop("réponse ElevenLabs incomplète (pas de son ou pas de minutage).");
const w = mots(al);
if (!w.length) stop("aucun mot minuté.");
fs.writeFileSync(path.join(dir, "voix.mp3"), Buffer.from(data.audio_base64, "base64"));
fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify(w));
if (!simu) fs.writeFileSync(fSha, sha + "\n");
const fin = w[w.length - 1].e;
console.log(`Voix prête : ${w.length} mots, ${fin.toFixed(2)} s (${Math.round((w.length / fin) * 60)} mots/min). Durée conseillée de la vidéo : ${Math.ceil((fin + 1.2) * 30)} images.`);
