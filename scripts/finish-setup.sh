#!/bin/zsh
# Finishes Cheffy setup once the 4 key files exist. Never prints a key.
set -e
cd "$(dirname "$0")/.."
APP=https://cheffy-ten.vercel.app

setenv() { # name file
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  tr -d '\n' < "$2" | vercel env add "$1" production >/dev/null 2>&1
  echo "set $1"
}

echo "== Local tool test (Exa + Jev)"
node scripts/test-tools.mjs

echo "== Vercel private settings"
setenv EXA_API_KEY ~/.cheffy-exa-key
setenv TYPESAFE_API_KEY ~/.cheffy-typesafe-key
setenv VAPI_PUBLIC_KEY ~/.cheffy-vapi-public-key

echo "== Deepgram key in Vapi"
if [ -s ~/.cheffy-deepgram-key ]; then node scripts/add-deepgram.mjs || true; else echo "no Deepgram key file, using Vapi's built-in Deepgram"; fi

echo "== Vapi assistant"
node scripts/create-assistant.mjs "$APP"
setenv VAPI_ASSISTANT_ID ~/.cheffy-assistant-id

echo "== Deploy"
vercel deploy --prod --yes >/dev/null 2>&1 && echo "deployed $APP"

echo "== Live checks"
curl -s -o /dev/null -w "tools without secret: %{http_code} (want 401)\n" -X POST "$APP/api/vapi-tools" -H 'Content-Type: application/json' -d '{}'
curl -s -X POST "$APP/api/vapi-tools" -H 'Content-Type: application/json' -H "x-tool-secret: $(cat ~/.cheffy-tool-secret)" \
  -d '{"message":{"type":"tool-calls","toolCallList":[{"id":"c1","function":{"name":"find_recipe","arguments":{"query":"shakshuka"}}}]}}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s).results[0];const o=JSON.parse(r.result);console.log("live find_recipe:",o.recipe_title,"|",o.source,"| chosen by",o.chosen_by)})'
curl -s "$APP/api/config" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);console.log("config: publicKey",c.publicKey?"set":"MISSING","| assistantId",c.assistantId?"set":"MISSING")})'
