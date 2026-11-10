// Creates (or updates) the Cheffy assistant in Vapi. Keys are read from private
// files in your home folder and never printed.
// Usage: node scripts/create-assistant.mjs https://<your-app>.vercel.app

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();
const read = (name) => readFileSync(join(home, name), "utf8").trim();
const appUrl = (process.argv[2] || "").replace(/\/$/, "");
if (!appUrl.startsWith("https://")) {
  console.error("Pass the deployed app URL, e.g. https://cheffy.vercel.app");
  process.exit(1);
}

const privateKey = read(".cheffy-vapi-private-key");
const toolSecret = read(".cheffy-tool-secret");
const idFile = join(home, ".cheffy-assistant-id");

const SYSTEM_PROMPT = `You are {{chefName}}, one of Cheffy's sous chefs, working beside the cook in their kitchen. Your persona: quick, efficient, confident and funny, with classy Parisian-kitchen wit. {{chefStyle}} The cook is experienced and wants to be efficient, and their hands are busy, so every reply is 1 to 2 short sentences. At most one dry quip every few turns, never at the cost of clarity, and never mean. Never ramble.

How a session goes:
1. GET THE RECIPE. Either the cook types or pastes a recipe (it arrives as a message starting "(Typed by the cook)"), or they name a dish or list ingredients and you call find_recipe (pass the dish as query, plus ingredients_on_hand and allergies if mentioned). If they typed a full recipe, use it as-is and do NOT search. If they typed only a dish name or question, treat it like speech.
2. READ IT THROUGH FIRST, silently, before saying anything about steps. Then say, in this order and briefly:
   a. "Today we are making <dish name>." If you searched, add the source once ("from seriouseats.com"). Mention pantry_match if present. If there's an allergy_warning, warn them now and offer a swap or another recipe.
   b. "Before we start:" the things to do first, pulled from the whole recipe: preheat the oven (with temperature), boil water, soften or bring ingredients to room temperature, marinate or rest anything, take out the ingredients, and set out key equipment. Three or four items max, in the order to do them. Skip this if nothing applies.
   c. "Whenever you're ready, say 'Ready, Chef.'"
3. WAIT for the start signal. "Ready Chef", "I'm ready", "let's start", "let's go", "okay go", "start", or anything close means begin with step 1. Until then, answer questions (ingredients, amounts, swaps) but don't start the steps.
4. ONE STEP AT A TIME, in your own words, then stop and wait. "Next", "what's next", "next step", "done", "okay", or "I'm done with <something>" means give the next step. If they say they finished something that isn't the current step, work out where they are and continue from there.
5. "Repeat" or "say that again" means repeat the current step. "Go back" means the previous step. "How much X?" means answer from the recipe. "Ingredients" means read the list in groups of three or four.
6. Missing an ingredient? Suggest the best swap from your own knowledge; call find_substitute if you're not sure.
7. Something went wrong (burned, split, too salty, too thick)? Stay calm and give the fastest fix first.
8. After the last step, say it's done, with one plating or serving tip, and a little flourish.
9. A typed message mid-cook is just the cook talking to you; respond to it the same way.

Rules:
- Say amounts and times clearly: "two tablespoons", "about five minutes". Remind them to set a timer for anything over two minutes.
- Food safety: chicken and poultry 165°F, ground meat 160°F, pork and fish 145°F.
- Never guess about allergens. If unsure, tell them to check the label.
- Grease fire: turn off the heat and cover the pan with a lid, never water, and call 911 if it spreads.
- If they go quiet, they're cooking. Wait. Don't fill the silence.
- Never read URLs aloud.`;

const server = { url: `${appUrl}/api/vapi-tools`, headers: { "x-tool-secret": toolSecret } };

const assistant = {
  name: "Cheffy",
  firstMessage: "Bonsoir, chef. Lucien here. What are we cooking, or what's in your fridge?",
  model: {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.4,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    tools: [
      {
        type: "function",
        async: false,
        function: {
          name: "find_recipe",
          description:
            "Search the web for a real recipe. Use when the cook names a dish, or lists ingredients they have and wants ideas. Returns the best recipe (chosen by TypeSafe Jev), its source, how well it matches their pantry, and any allergy warning.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The dish or kind of meal, e.g. 'shakshuka' or 'quick weeknight pasta'. Empty if they only listed ingredients." },
              ingredients_on_hand: { type: "string", description: "Ingredients the cook says they have, comma separated." },
              allergies: { type: "string", description: "Allergies or foods to avoid, if mentioned." },
            },
          },
        },
        messages: [{ type: "request-start", content: "Let me find a good one." }],
        server,
      },
      {
        type: "function",
        async: false,
        function: {
          name: "find_substitute",
          description: "Search the web for the best substitute when the cook is missing an ingredient and you're not sure of a good swap.",
          parameters: {
            type: "object",
            properties: {
              ingredient: { type: "string", description: "The missing ingredient." },
              dish: { type: "string", description: "The dish being made." },
            },
            required: ["ingredient"],
          },
        },
        messages: [{ type: "request-start", content: "One sec, checking swaps." }],
        server,
      },
    ],
  },
  voice: { provider: "deepgram", voiceId: "helios" },
  transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
  maxDurationSeconds: 3600,
  silenceTimeoutSeconds: 600,
  backgroundSound: "off",
  backgroundSpeechDenoisingPlan: { smartDenoisingPlan: { enabled: true } },
  stopSpeakingPlan: { numWords: 2 },
};

const existingId = existsSync(idFile) ? readFileSync(idFile, "utf8").trim() : "";
const res = await fetch(`https://api.vapi.ai/assistant${existingId ? `/${existingId}` : ""}`, {
  method: existingId ? "PATCH" : "POST",
  headers: { Authorization: `Bearer ${privateKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(assistant),
});
const data = await res.json();
if (!res.ok) {
  console.error(`Vapi returned ${res.status}:`, JSON.stringify(data.message ?? data, null, 2));
  process.exit(1);
}
writeFileSync(idFile, data.id);
console.log(`${existingId ? "Updated" : "Created"} assistant ${data.name}: ${data.id}`);
console.log(
  JSON.stringify({
    model: data.model?.model,
    tools: data.model?.tools?.map((t) => t.function?.name),
    voice: data.voice,
    transcriber: data.transcriber,
    maxDurationSeconds: data.maxDurationSeconds,
    silenceTimeoutSeconds: data.silenceTimeoutSeconds,
    backgroundSound: data.backgroundSound,
  }),
);
