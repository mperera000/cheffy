# Cheffy — your hands-free voice sous chef

**Live:** https://cheffy-ten.vercel.app · **Demo:** [`demo/cheffy-walkthrough.mp4`](demo/cheffy-walkthrough.mp4) · **PRD:** [`PRD.md`](PRD.md)

Built in one evening at Build Club × Vapi's *Side Quest Hotline* hackathon (San Francisco, Nov 9, 2026).

When you're deep in a recipe, your hands are covered in flour and your phone is locked. Cheffy talks you through it instead. Pick your sous chef, tell them what you're making (or what's in your fridge, or paste a recipe), and they'll:

1. Find a real recipe, or read yours.
2. Say **"Today we are making …"** and list what to do first: preheat the oven, take out the ingredients, set out the pan.
3. Wait for **"Ready, Chef."**
4. Give one step at a time on "next" or "I'm done chopping," handle swaps ("I'm out of feta"), and rescue mistakes.

The screen follows along: the dish, a tickable prep checklist, **Step 3 of 6** with a progress bar, and the step in large type you can read across the counter.

## Meet the chefs

Two original characters in a *Le Classique* Parisian-kitchen style, each with their own voice and personality: quick, efficient, confident and funny.

| | Persona | Voice |
|---|---|---|
| **Lucien**, The Maître | Old-school, precise, deadpan, one eyebrow always raised | Deepgram `helios` |
| **Margaux**, La Patronne | Unflappable, warm, a sly wink | Deepgram `athena` |

Design explorations (Concept A *Le Classique*, approved, and Concept B *Le Moderne*) are in [`design/mockups/`](design/mockups/). They're Claude Design canvas files and need the canvas runtime to render.

## How it works

```
Phone browser (public/index.html)
  └─ Vapi Web SDK call ──► Vapi assistant "Cheffy" (gpt-4o, Deepgram nova-3 ears + Aura voice)
                              ├─ find_recipe / find_substitute ──► /api/vapi-tools (Vercel)
                              │      Exa search (lite, with objective) → TypeSafe Jev picks the best
                              │      recipe, scores the pantry match, checks allergies
                              └─ show_recipe / show_step ──► client-side tools that update the screen
```

| Tool | Role |
|---|---|
| **Vapi** | Voice orchestration, web calls, tool calling, client-side screen tools |
| **Deepgram** | Speech-to-text (nova-3) and the chefs' voices (Aura) |
| **Exa** | Live recipe and substitution search ([build-with-exa](.agents/skills/build-with-exa/SKILL.md) skill) |
| **TypeSafe Jev** | ~100 ms structured decisions: best recipe, pantry-match score, allergy conflict |
| **Vercel** | Hosting for the page and the tool endpoint |

Graceful fallbacks: if Jev is slow (>1.5 s) Cheffy uses Exa's top result; if Exa fails, the chef cooks from their own knowledge without saying search is down.

## Run your own

Keys live in files in your home folder and are never committed. Save each one with a hidden prompt that also checks it works:

```bash
scripts/save-key.sh vapi-private   # also: vapi-public, exa, typesafe, deepgram
```

Then deploy and set up the assistant:

```bash
vercel deploy --prod
scripts/finish-setup.sh            # tests tools, sets Vercel env vars, creates the Vapi assistant, redeploys
```

- `scripts/create-assistant.mjs <app-url>`: create or update the Vapi assistant (prompt, voices, tools)
- `scripts/test-tools.mjs`: run the Exa + Jev recipe tools locally
- Add `?preview` to the URL to drive cooking mode without a call (`window.cheffyPreview.showRecipe(...)` / `.showStep(...)`), which is handy for demo shots.

## Roadmap

Timers that call you back, pantry memory, a Thanksgiving multi-dish timeline, grocery lists by text, and smart-speaker support.
