// Fait dire la même phrase par plusieurs voix de base, pour qu'Aicha choisisse en écoutant.
// Écrit out/voix/<numéro>-<nom>.mp3. Usage : node scripts/essai-voix.mjs ["phrase"] [--voix id1,id2]
import fs from "node:fs";
import path from "node:path";
import { parler, propre } from "./eleven.mjs";

// Voix de base d'ElevenLabs (utilisables avec un compte gratuit), choisies pour un ton « réseaux sociaux ».
export const CANDIDATES = [
  { nom: "jessica-femme-petillante", id: "cgSgspJ2msm6clMCkdW9" },
  { nom: "laura-femme-punchy", id: "FGY2WhTYpPnrIDTdsKH5" },
  { nom: "lily-femme-douce-nette", id: "pFZP5JQG7iQjIQuC4Bku" },
  { nom: "matilda-femme-chaleureuse", id: "XrExE9yKIg1WjnnlVkGX" },
  { nom: "chris-homme-naturel", id: "iP95p4xoKVk53GoZ742B" },
  { nom: "will-homme-jeune", id: "bIHbv24MWmeRgasZH58o" },
  { nom: "brian-homme-grave", id: "nPczCjzI2devNBz1zQrb" },
];

const args = process.argv.slice(2);
const texte = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--voix")
  || "Soixante-quatorze soldats ont fait tomber un pont, juste en marchant dessus. Tu vois pourquoi ?";
const choix = args.includes("--voix") ? args[args.indexOf("--voix") + 1].split(",").map((x) => x.trim()).filter(Boolean) : null;
const liste = choix ? choix.map((id, i) => ({ nom: "voix-" + (i + 1), id })) : CANDIDATES;
const key = propre(process.env.ELEVENLABS_API_KEY);
if (!key) { console.error("ERREUR : le secret ELEVENLABS_API_KEY est absent."); process.exit(1); }
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../out/voix");
fs.mkdirSync(dir, { recursive: true });
console.log(`${liste.length} voix x ${texte.length} caractères = ${liste.length * texte.length} caractères dépensés.`);
let ok = 0;
for (const [i, v] of liste.entries()) {
  try {
    const out = await parler({ texte, voiceId: v.id, key });
    fs.writeFileSync(path.join(dir, `${i + 1}-${v.nom}.mp3`), out.mp3);
    console.log(`  ${i + 1}. ${v.nom} : prêt (${out.words[out.words.length - 1].e.toFixed(1)} s)`);
    ok++;
  } catch (e) { console.log(`  ${i + 1}. ${v.nom} : raté — ${e.message.split("\n")[0]}`); }
  await new Promise((r) => setTimeout(r, 1200));
}
fs.writeFileSync(path.join(dir, "phrase.txt"), texte + "\n");
if (!ok) { console.error("Aucune voix n'a marché."); process.exit(1); }
