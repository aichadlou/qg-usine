#!/usr/bin/env bash
# Colle les morceaux rendus et ajoute le son : voix (voix.mp3) + musique facultative (musique.mp3 ou .wav, baissée sous la voix).
# Usage : scripts/assemble.sh <id> <dossier des morceaux> <fichier final.mp4>
set -euo pipefail
id="$1"; parts="$2"; final="$3"
ici="$(cd "$(dirname "$0")/.." && pwd)"; v="$ici/src/videos/$id"
tmp="$(mktemp -d)"
for f in $(ls "$parts"/part-*.mp4 | sort); do echo "file '$(realpath "$f")'"; done > "$tmp/liste.txt"
[ -s "$tmp/liste.txt" ] || { echo "ERREUR : aucun morceau à assembler"; exit 1; }
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$tmp/liste.txt" -c copy "$tmp/muet.mp4"
dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp/muet.mp4")"
mus=""; for f in "$v/musique.mp3" "$v/musique.wav" "$v/musique.m4a"; do [ -f "$f" ] && mus="$f"; done
norm="loudnorm=I=-15:TP=-1.2:LRA=9,aresample=48000"
if [ -f "$v/voix.mp3" ] && [ -n "$mus" ]; then
  echo "Son : voix + musique (musique baissée quand la voix parle)."
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/muet.mp4" -i "$v/voix.mp3" -stream_loop -1 -i "$mus" -filter_complex \
    "[1:a]aresample=48000,apad,asplit=2[vx][cle];[2:a]aresample=48000,volume=0.30[m];[m][cle]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450[md];[vx][md]amix=inputs=2:duration=first:normalize=0,$norm[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$dur" -movflags +faststart "$final"
elif [ -f "$v/voix.mp3" ]; then
  echo "Son : voix seule (pas de musique.mp3 dans le dossier de la vidéo)."
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/muet.mp4" -i "$v/voix.mp3" -filter_complex "[1:a]aresample=48000,apad,$norm[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$dur" -movflags +faststart "$final"
elif [ -n "$mus" ]; then
  echo "Son : musique seule (pas encore de voix)."
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/muet.mp4" -stream_loop -1 -i "$mus" -filter_complex "[1:a]aresample=48000,$norm[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$dur" -movflags +faststart "$final"
else
  echo "ATTENTION : ni voix ni musique, la vidéo est muette."
  ffmpeg -hide_banner -loglevel error -y -i "$tmp/muet.mp4" -c copy -movflags +faststart "$final"
fi
echo "Vidéo finale : $final ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$final") s)"
