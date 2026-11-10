// Adds your Deepgram key to Vapi so Cheffy's speech uses your Deepgram credits.
// Keys are read from private files and never printed.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const read = (n) => readFileSync(join(homedir(), n), "utf8").trim();
const res = await fetch("https://api.vapi.ai/credential", {
  method: "POST",
  headers: { Authorization: `Bearer ${read(".cheffy-vapi-private-key")}`, "Content-Type": "application/json" },
  body: JSON.stringify({ provider: "deepgram", apiKey: read(".cheffy-deepgram-key"), name: "Cheffy Deepgram" }),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.log(`Deepgram key not added (Vapi said ${res.status}: ${JSON.stringify(data.message ?? data)}). Cheffy still works on Vapi's built-in Deepgram.`);
} else {
  console.log(`Deepgram key added to Vapi (credential ${data.id})`);
}
