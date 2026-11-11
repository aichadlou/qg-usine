# QG Usine : l'usine à vidéos

Fabrique les YouTube Shorts animés du QG (personnages 2D dans un monde 3D, three.js + Remotion), en français.
Le rendu tourne gratuitement sur GitHub Actions (dépôt public). Aucune clé dans le code : la voix utilise deux secrets GitHub.

## La chaîne (une vidéo = un dossier `usine/src/videos/<id>/`, sur une branche `video-<mot-clé>`)

| Étape | Fichier à pousser | Ce qui se passe tout seul |
|---|---|---|
| 1. Script | `script.txt` (le texte dit par la voix, lignes `#` ignorées) | « Usine - Voix » appelle ElevenLabs et range `voix.mp3` + `words.json` (minutage mot par mot) dans le dossier |
| 2. Images | `index.tsx`, `story.ts`… (copier `modele/`) calés sur `words.json` | rien : vérifier d'abord des images fixes |
| 3. Rendu | `rendu.txt` contenant `720` (essai) ou `1080` (final) | « Usine - Rendu » : 12 morceaux en parallèle, collage, son, MP4 publié dans **Releases** |

- Musique facultative : `musique.mp3` dans le dossier de la vidéo (baissée automatiquement sous la voix). Uniquement de la musique originale ou libre de droits.
- Réglages de voix facultatifs : `voix.json` (`modele`, `stabilite`, `ressemblance`, `style`, `vitesse`).
- Une voix dont le texte n'a pas changé n'est jamais refaite (fichier `voix.sha`) : pas de caractères ElevenLabs gaspillés.
- Sous-titres : automatiques (1 à 3 mots, mot prononcé en jaune), à partir de `words.json`.
- `index.tsx` de chaque vidéo exporte `video = { id, frames, Scene, words }` ; `id` = nom du dossier (a-z, 0-9, -).

## Secrets (Settings → Secrets and variables → Actions)
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`. Jamais dans le chat, jamais dans le code.

## Règles
Histoires, personnages et voix originaux ; faits vérifiés avant d'écrire ; aucun logo, personnage ou musique protégés.
La branche `main` ne reçoit que du code validé par Aicha (pull request).
