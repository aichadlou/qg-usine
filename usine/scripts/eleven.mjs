// Appel d'ElevenLabs partagé par scripts/voix.mjs (la vraie voix off) et scripts/essai-voix.mjs (les essais de voix).
// Aucune clé n'est écrite ici : elles viennent des secrets GitHub.

// Un copier-coller ramène parfois du vide, des guillemets ou un retour à la ligne : on garde la première ligne utile.
export const propre = (v) => (v || "").split("\n").map((x) => x.trim().replace(/^["'<]+|[">']+$/g, "")).filter(Boolean)[0] || "";

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
  // la ponctuation isolée se colle au mot d'avant
  return out.reduce((acc, m) => { if (/^[?!:;…—-]+$/.test(m.w) && acc.length) { acc[acc.length - 1].w += /^[—-]+$/.test(m.w) ? "" : m.w; acc[acc.length - 1].e = m.e; } else acc.push(m); return acc; }, []);
};

export const corpsVoix = (texte, reg = {}) => ({
  text: texte,
  model_id: reg.modele || "eleven_multilingual_v2",
  voice_settings: {
    stability: reg.stabilite ?? 0.32,        // bas = vivant, haut = plat ; 0.3 environ = ton des réseaux sociaux
    similarity_boost: reg.ressemblance ?? 0.75,
    style: reg.style ?? 0.55,                // haut = plus d'intention, d'accents, de relances
    use_speaker_boost: true,
    speed: reg.vitesse ?? 1.12,              // un Short parle vite
  },
});

export const explique = (statut, texte) =>
  statut === 401 ? "Clé refusée : vérifie le secret ELEVENLABS_API_KEY (droit « Text to Speech »)."
  : /quota|character.?limit/i.test(texte) ? "Plus assez de caractères ElevenLabs ce mois-ci."
  : /paid_plan_required|library voices/i.test(texte) ? "Cette voix vient de la bibliothèque : un compte gratuit ne peut pas s'en servir par l'usine. Prends une voix de base."
  : /invalid_uid|invalid ID/i.test(texte) ? "L'identifiant de voix n'est pas bon : un seul code d'environ 20 lettres et chiffres."
  : "Voir le détail ci-dessous.";

/** Demande la voix + le minutage. Renvoie { mp3: Buffer, words: [{w,s,e}] }. */
export async function parler({ texte, voiceId, key, reglages, simulation }) {
  let data = simulation;
  if (!data) {
    let r, essai = 0;
    for (;;) {
      r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify(corpsVoix(texte, reglages)),
      });
      if ((r.status === 429 || r.status >= 500) && essai++ < 3) { await new Promise((ok) => setTimeout(ok, 8000 * essai)); continue; }
      break;
    }
    if (!r.ok) {
      const t = (await r.text()).slice(0, 600).replaceAll(key, "***");
      const err = new Error(`ElevenLabs a répondu ${r.status}. ${explique(r.status, t)}\n${t}`);
      err.statut = r.status;
      throw err;
    }
    data = await r.json();
  }
  const al = data.alignment?.characters?.length ? data.alignment : data.normalized_alignment;
  if (!data.audio_base64 || !al) throw new Error("réponse ElevenLabs incomplète (pas de son ou pas de minutage).");
  const w = mots(al);
  if (!w.length) throw new Error("aucun mot minuté.");
  return { mp3: Buffer.from(data.audio_base64, "base64"), words: w };
}
