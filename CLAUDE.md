# CLAUDE.md — QG Usine (usine à vidéos)

Dépôt PUBLIC de l'usine à vidéos du QG d'Aicha. Aicha est débutante en code : ne jamais lui demander de lancer une commande,
expliquer les clics pas à pas, finir par un résumé simple + où trouver la vidéo (onglet Releases), clic par clic.

- Lire `README.md` : la chaîne script → voix → images → rendu y est décrite.
- Dépôt public : aucun secret, aucune donnée personnelle, aucune image de référence d'une autre chaîne, aucun logo réel.
- Travailler sur une branche `video-<mot-clé>` + pull request. Ne jamais pousser sur `main` sans l'accord d'Aicha.
- Vérifier avant de pousser : `cd usine && npm run verif`. Vérifier des images fixes avant un rendu complet ; essai en 720 avant le 1080.
- La voix coûte des caractères ElevenLabs : ne changer `script.txt` que lorsque le texte est validé.
- Le conteneur des sessions ne joint pas ElevenLabs : la voix se fabrique uniquement par le workflow « Usine - Voix ».
- Modèle de vidéo : `usine/src/videos/modele/` (démo du pont). Le mixage détaillé d'origine est dans `usine/audio/` (référence).
