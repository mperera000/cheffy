#!/bin/zsh
# Saves one Cheffy key from a hidden prompt (paste with Cmd+V, then Enter),
# then checks it with the service. Never prints the key.
# Usage: save-key.sh vapi-private | vapi-public | exa | typesafe | deepgram
name="$1"
case "$name" in
  vapi-private|vapi-public|exa|typesafe|deepgram) ;;
  *) echo "Usage: save-key.sh vapi-private|vapi-public|exa|typesafe|deepgram"; exit 1 ;;
esac
file="$HOME/.cheffy-$name-key"
read -rs "key?Paste your $name key, then press Enter: "
echo
# Strip bracketed-paste markers and anything that can't be part of a key.
key="${key//$'\e'\[200~/}"
key="${key//$'\e'\[201~/}"
key="${key//[^A-Za-z0-9._-]/}"
if [ -z "$key" ]; then echo "Nothing pasted. Try again."; exit 1; fi
print -rn -- "$key" > "$file" && chmod 600 "$file"

case "$name" in
  vapi-private) code=$(curl -s -o /dev/null -w "%{http_code}" "https://api.vapi.ai/assistant?limit=1" -H "Authorization: Bearer $key") ;;
  vapi-public)  [[ "$key" =~ ^[0-9a-fA-F-]{36}$ ]] && code=200 || code="not a Vapi public key format" ;;
  exa)          code=$(curl -s -o /dev/null -w "%{http_code}" https://api.exa.ai/search -H "x-api-key: $key" -H 'Content-Type: application/json' -d '{"query":"pancake recipe","numResults":1}') ;;
  typesafe)     code=$(curl -s -o /dev/null -w "%{http_code}" https://api.typesafe.ai/v1/systemone -H "Authorization: Bearer $key" -H 'Content-Type: application/json' -d '{"model":"jev-latest","state":{"m":"hi"},"questions":{"q":{"type":"noul","instructions":"Does `m` greet?"}}}') ;;
  deepgram)     code=$(curl -s -o /dev/null -w "%{http_code}" https://api.deepgram.com/v1/projects -H "Authorization: Token $key") ;;
esac

if [ "$code" = "200" ]; then
  echo "✅ $name key saved and working."
else
  echo "❌ $name key saved but rejected ($code). Copy it again from the dashboard and rerun."
fi
