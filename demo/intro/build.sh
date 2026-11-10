#!/bin/zsh
# Builds demo/cheffy-intro.mp4: Deepgram voices ("Bonsoir," Lucien / "chef!" Margaux),
# 60 frames rendered from intro.html, then muxed with ffmpeg. Never prints a key.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${1:-$(mktemp -d)}"
OUT="$HERE/../cheffy-intro.mp4"
mkdir -p "$WORK"
KEY=$(tr -d '[:space:]' < ~/.cheffy-deepgram-key)

tts() { # voice text name
  curl -sf -o "$WORK/$3_raw.mp3" -X POST "https://api.deepgram.com/v1/speak?model=aura-$1-en" \
    -H "Authorization: Token $KEY" -H "Content-Type: application/json" -d "{\"text\":\"$2\"}"
  ffmpeg -y -loglevel error -i "$WORK/$3_raw.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse" \
    -ar 48000 -ac 2 "$WORK/$3.wav"
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/$3.wav"
}

LD=$(tts helios "Bonsoir," lucien)
MD=$(tts athena "chef!" margaux)
LS=0.50
MS=$(printf "%.2f" $(( LS + LD + 0.09 )))
echo "Lucien ${LS}s +${LD}s, Margaux ${MS}s +${MD}s"

node "$HERE/render.mjs" "$WORK/frames" "ls=$LS&ld=$LD&ms=$MS&md=$MD"

LMS=$(printf "%.0f" $(( LS * 1000 )))
MMS=$(printf "%.0f" $(( MS * 1000 )))
ffmpeg -y -loglevel error -framerate 30 -i "$WORK/frames/f%03d.png" -i "$WORK/lucien.wav" -i "$WORK/margaux.wav" \
  -filter_complex "[1]adelay=${LMS}|${LMS}[a1];[2]adelay=${MMS}|${MMS}[a2];[a1][a2]amix=inputs=2:normalize=0,volume=3.5,alimiter=limit=0.9,apad[a]" \
  -map 0:v -map "[a]" -t 2 -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -r 30 \
  -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "wrote $OUT"
