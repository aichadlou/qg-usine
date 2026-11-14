# QG Usine : l'usine à vidéos

Fabrique les YouTube Shorts animés du QG (personnages 2D dans un monde 3D, three.js + Remotion), en français.
Le rendu tourne gratuitement sur GitHub Actions (dépôt public). Aucune clé dans le code : la voix utilise deux secrets GitHub.

## La chaîne (une vidéo = un dossier `usine/src/videos/<id>/`)

Deux façons de faire la voix. La **voix à la main** permet d'utiliser n'importe quelle voix du site ElevenLabs
(y compris celles de la bibliothèque) avec un compte gratuit ; la **voix automatique** ne marche qu'avec les voix de base.

### A. Voix à la main (gratuit, n'importe quelle voix) — la méthode d'Aicha
| Étape | Ce qu'Aicha fait | Ce qui se passe tout seul |
|---|---|---|
| 1 | Déposer `script.txt` (le texte, lignes `#` ignorées) | rien |
| 2 | Sur elevenlabs.io : coller le texte, choisir la voix, **Generate**, **Download** | rien |
| 3 | Déposer le fichier sous le nom `voix.mp3` dans le dossier de la vidéo | « Usine - Sous-titres » écoute le son et range `words.json` (minutage mot par mot) |
| 4 | Déposer `rendu.txt` contenant `720` ou `1080` | « Usine - Rendu » : 12 morceaux en parallèle, collage, son, MP4 dans **Releases** |

L'écoute est gratuite (whisper.cpp sur GitHub, sans clé ni compte) et dure 2 à 3 minutes.
Les mots de `script.txt` font foi pour l'orthographe : l'écoute ne sert qu'à donner l'heure de chaque mot.
Mesure : 0,11 s d'écart moyen avec le minutage exact, sur un essai de 14 mots.

### B. Voix automatique (voix de base seulement)
Déposer `script.txt` : « Usine - Voix » appelle ElevenLabs et range `voix.mp3` + `words.json` sans rien faire d'autre.
Les voix de la **bibliothèque** sont refusées par ElevenLabs sur un compte gratuit (erreur 402) : voir la méthode A.

### Dans les deux cas
- Images : copier `usine/src/videos/modele/` et caler `story.ts` sur `words.json`. Vérifier des images fixes avant un rendu complet.
- Musique facultative : `musique.mp3` dans le dossier (baissée automatiquement sous la voix). Musique originale ou libre de droits uniquement.
- Réglages de voix facultatifs (méthode B) : `voix.json` (`voix`, `modele`, `stabilite`, `ressemblance`, `style`, `vitesse`).
- Sous-titres : automatiques (1 à 3 mots, mot prononcé en jaune).
- `index.tsx` exporte `video = { id, frames, Scene, words }` ; `id` = nom du dossier (a-z, 0-9, -).
- Boutons dans l'onglet **Actions** : « Usine - Essai de voix » (comparer des voix), « Usine - Sous-titres », « Usine - Rendu ».

## Secrets (Settings → Secrets and variables → Actions)
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`. Jamais dans le chat, jamais dans le code.

## Règles
Histoires, personnages et voix originaux ; faits vérifiés avant d'écrire ; aucun logo, personnage ou musique protégés.
La branche `main` ne reçoit que du code validé par Aicha (pull request).
