// Cheffy's tools. Exa finds real recipes and swaps; TypeSafe Jev makes the fast
// structured decisions (which recipe fits, how well it matches the pantry, any
// allergy conflict). If Jev is slow or down, we fall back to Exa's top result.

const EXA_URL = "https://api.exa.ai/search";
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_TIMEOUT_MS = 1500;
const EXA_TIMEOUT_MS = 8000;

async function postJson(url, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the web";
  }
}

// Per Exa's build-with-exa skill: every tool-call search carries an `objective`,
// voice paths use the low-latency `lite` type (recipes are evergreen, so cached
// pages are fine), and contents are requested explicitly with a character budget.
// If `lite` rejects a parameter (400), retry once with the default `auto` type.
async function exaSearch({ query, objective, numResults, contents }) {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set");
  const body = { query, objective, type: "lite", numResults, contents };
  let data;
  try {
    data = await postJson(EXA_URL, { "x-api-key": key }, body, EXA_TIMEOUT_MS);
  } catch (err) {
    if (!String(err.message).includes("returned 400")) throw err;
    data = await postJson(EXA_URL, { "x-api-key": key }, { ...body, type: "auto" }, EXA_TIMEOUT_MS);
  }
  return (data.results ?? [])
    .map((r, i) => {
      const text = r?.text || (Array.isArray(r?.highlights) ? r.highlights.join(" … ") : "");
      return {
        id: `r${i}`,
        title: r?.title || "Untitled recipe",
        url: r?.url,
        source: hostOf(r?.url),
        text: String(text).replace(/\s+/g, " ").trim(),
      };
    })
    .filter((r) => r.text);
}

const OWN_KNOWLEDGE =
  "Live recipe search isn't available right now. Don't mention that. Pick a classic, reliable recipe from your own knowledge that fits the request and uses as much of what they have as possible. Don't name a website. Say the dish name, then continue with the ingredient check and one step at a time.";

// One Jev call: pick the best candidate, score each one's pantry match, and
// check each one against allergies. Returns null if Jev can't answer in time.
async function jevDecide(candidates, { request, ingredients, allergies }) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key || candidates.length === 0) return null;

  const state = {
    request,
    ingredients_on_hand: ingredients || "not stated",
    allergies: allergies || "none stated",
    recipes: Object.fromEntries(
      candidates.map((c) => [c.id, { title: c.title, source: c.source, excerpt: c.text.slice(0, 700) }]),
    ),
  };

  const questions = {
    best_recipe: {
      type: "choice",
      instructions:
        "Which recipe in `recipes` best fits the cook's `request`, makes the most use of `ingredients_on_hand`, and is a real, complete recipe (not a list article)?",
      criteria: Object.fromEntries(candidates.map((c) => [c.id, `${c.title} (${c.source})`])),
    },
  };
  if (ingredients) {
    for (const c of candidates) {
      questions[`match_${c.id}`] = {
        type: "score",
        instructions: `How well does recipe \`recipes.${c.id}\` use what the cook already has in \`ingredients_on_hand\`?`,
        criteria: [
          "needs mostly ingredients the cook doesn't have",
          "uses some of the cook's ingredients",
          "uses most of the cook's ingredients",
          "uses almost everything the cook has and needs little else",
        ],
      };
    }
  }
  if (allergies) {
    for (const c of candidates) {
      questions[`allergy_${c.id}`] = {
        type: "noul",
        instructions: `Does recipe \`recipes.${c.id}\` contain or likely contain anything the cook is allergic to, per \`allergies\`?`,
      };
    }
  }

  try {
    const data = await postJson(
      JEV_URL,
      { Authorization: `Bearer ${key}` },
      { model: "jev-latest", state, questions },
      JEV_TIMEOUT_MS,
    );
    return data.answers ?? null;
  } catch (err) {
    console.error("Jev fallback:", err.message);
    return null;
  }
}

const MATCH_WORDS = [
  "needs a lot you don't have",
  "uses some of what you have",
  "uses most of what you have",
  "uses almost everything you have",
];

async function findRecipe(args) {
  const request = String(args.query || args.dish || "").trim();
  const ingredients = String(args.ingredients_on_hand || "").trim();
  const allergies = String(args.allergies || "").trim();
  if (!request && !ingredients) return "Ask the cook what they want to make or what ingredients they have.";
  if (!process.env.EXA_API_KEY) return OWN_KNOWLEDGE;

  const query = request
    ? `${request} recipe${ingredients ? ` using ${ingredients}` : ""}`
    : `easy home recipe using ${ingredients}`;
  const objective =
    `Find complete home-cooking recipe pages for: ${request || "a dish"}` +
    (ingredients ? `, ideally using ${ingredients}` : "") +
    (allergies ? `, avoiding ${allergies}` : "") +
    ". Rank single-recipe pages with an ingredient list with amounts and step-by-step method first. Exclude roundup listicles, videos, and forum threads. Extract the ingredients with amounts and the method steps.";
  let candidates;
  try {
    // 5 results on purpose: Jev chooses among them.
    candidates = await exaSearch({ query, objective, numResults: 5, contents: { text: { maxCharacters: 3000 } } });
  } catch (err) {
    console.error("Exa fallback:", err.message);
    return OWN_KNOWLEDGE;
  }
  if (candidates.length === 0) return OWN_KNOWLEDGE;

  const answers = await jevDecide(candidates, { request: request || query, ingredients, allergies });
  const pickedId = answers?.best_recipe?.choice;
  const picked = candidates.find((c) => c.id === pickedId) ?? candidates[0];

  const out = {
    recipe_title: picked.title,
    source: picked.source,
    url: picked.url,
    chosen_by: answers ? "TypeSafe Jev" : "top search result",
    recipe_text: picked.text,
  };
  const match = answers?.[`match_${picked.id}`];
  if (match && typeof match.score === "number") {
    out.pantry_match = MATCH_WORDS[Math.max(0, Math.min(3, Math.round(match.score)))] ?? match.legend ?? match.score;
  }
  const allergy = answers?.[`allergy_${picked.id}`];
  if (allergy && typeof allergy.noul === "number" && allergy.noul >= 0.5) {
    out.allergy_warning = `This recipe may conflict with the cook's allergies (${allergies}). Warn them and offer a swap or a different recipe.`;
  }
  out.other_options = candidates.filter((c) => c.id !== picked.id).map((c) => `${c.title} (${c.source})`);
  return JSON.stringify(out);
}

async function findSubstitute(args) {
  const ingredient = String(args.ingredient || "").trim();
  const dish = String(args.dish || "").trim();
  if (!ingredient) return "Ask which ingredient they're missing.";
  const ownSwap = "Suggest the best swap from your own cooking knowledge, with the amount. Don't mention search.";
  if (!process.env.EXA_API_KEY) return ownSwap;
  try {
    const results = await exaSearch({
      query: `best substitute for ${ingredient}${dish ? ` in ${dish}` : ""}`,
      objective: `Find cooking guidance on substituting ${ingredient}${dish ? ` in ${dish}` : ""}. Rank pages that give specific swaps with ratios first. Extract each swap and its amount.`,
      numResults: 3, // a few sources is enough to say one swap aloud
      contents: { highlights: { maxCharacters: 600 } },
    });
    if (results.length === 0) return ownSwap;
    return JSON.stringify(results.map((r) => ({ source: r.source, notes: r.text })));
  } catch (err) {
    console.error("Exa swap fallback:", err.message);
    return ownSwap;
  }
}

const TOOLS = { find_recipe: findRecipe, find_substitute: findSubstitute };

export async function runToolCall({ id, name, args }) {
  const tool = TOOLS[name];
  if (!tool) return { toolCallId: id, error: `Unknown tool: ${name}` };
  let parsed = args;
  if (typeof args === "string") {
    try {
      parsed = JSON.parse(args);
    } catch {
      parsed = {};
    }
  }
  try {
    return { toolCallId: id, result: await tool(parsed ?? {}) };
  } catch (err) {
    console.error(`${name} failed:`, err.message);
    return { toolCallId: id, result: "The lookup failed. Tell the cook briefly and help from your own knowledge." };
  }
}
