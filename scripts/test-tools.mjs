// Local check of the recipe tools with real Exa + Jev calls. Keys come from
// private files and are never printed.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const read = (n) => readFileSync(join(homedir(), n), "utf8").trim();
process.env.EXA_API_KEY = read(".cheffy-exa-key");
if (!process.argv.includes("--no-jev")) process.env.TYPESAFE_API_KEY = read(".cheffy-typesafe-key");

const { runToolCall } = await import("../lib/tools.js");

const t0 = Date.now();
const r = await runToolCall({
  id: "t1",
  name: "find_recipe",
  args: { ingredients_on_hand: "eggs, spinach, half an onion, feta", allergies: "peanuts" },
});
const out = (() => { try { return JSON.parse(r.result); } catch { return r; } })();
console.log(`find_recipe in ${Date.now() - t0} ms`);
console.log(JSON.stringify({ ...out, recipe_text: out.recipe_text?.slice(0, 160) + "…" }, null, 2));

const t1 = Date.now();
const s = await runToolCall({ id: "t2", name: "find_substitute", args: { ingredient: "buttermilk", dish: "pancakes" } });
console.log(`find_substitute in ${Date.now() - t1} ms:`, String(s.result).slice(0, 200) + "…");
