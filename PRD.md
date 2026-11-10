# Cheffy: Product Requirements (v0.1, hackathon build)

**Owner:** Malithi Perera · **Built:** Nov 9, 2026, Side Quest Hotline (Build Club × Vapi), San Francisco · **Live:** https://cheffy-ten.vercel.app

## 1. Product overview
Cheffy is a voice AI sous chef that lives in your phone. You talk, and Cheffy finds a real recipe, walks you through it one step at a time, and handles the "wait, I'm out of buttermilk" moments, so you never have to touch your phone with messy hands. Its voice plays through any Bluetooth speaker or earbuds, and an animated chef character shows when Cheffy is listening, thinking or talking.

## 2. Purpose, use cases and value propositions
**Problem:** When you cook from a recipe on your phone, your hands are wet, floury or holding a knife. The screen locks, you lose your place, recipe pages are buried in ads, and a missing ingredient stalls the whole dish.

**Use cases**
- **Follow a recipe hands-free:** "Next." "Repeat that." "How much garlic?"
- **Cook from what you have:** "I've got eggs, spinach, half an onion and feta."
- **Swap a missing ingredient mid-cook:** "I'm out of buttermilk."
- **Recover from a mistake:** "I burned the garlic." Cheffy gives the fastest fix first.

**Value propositions**
- Zero touches: voice in, voice out, and the screen stays awake.
- Real recipes from the live web (Exa), not ones the AI made up.
- Smart picks: TypeSafe Jev chooses the recipe that best matches your pantry and flags allergy conflicts in about 100 ms.
- A sous chef with personality: the animated Cheffy makes the app feel like a kitchen buddy, not a form.

## 3. Features and functionality
| Feature | Status tonight |
|---|---|
| Voice conversation (Vapi web call; Deepgram listens and speaks) | ✅ |
| `find_recipe`: Exa finds 5 candidates, then Jev picks the best one, scores the pantry match and checks allergies | ✅ |
| `find_substitute`: Exa searches for a swap when Cheffy isn't sure | ✅ |
| Step-by-step mode: next, repeat, go back, quantity questions | ✅ |
| Animated chef that reacts to listening, thinking and talking (mouth follows Cheffy's voice volume) | ✅ |
| Large caption card readable from across the counter | ✅ |
| Screen stays awake during a call | ✅ |
| Works through Bluetooth speakers and earbuds (handled by the phone) | ✅ |
| Add to home screen (installable web app) | ✅ |
| Long-call settings: 60-minute calls, 10-minute silence allowed, kitchen-noise filtering | ✅ |
| Timers that call you back, pantry memory, Google Home / Alexa | Roadmap |

## 4. User personas and user stories
**Primary persona: "Efficient Erin."** Cooks 4–5 nights a week and is confident in the kitchen. She improvises often and hates breaking her flow to wipe her hands and unlock her phone. She wants speed, not hand-holding.

**Secondary persona: "Weeknight Sam."** Has decent skills and limited time. Opens the fridge at 6pm with no plan.

**User stories**
- As Erin, I want to say "next" and hear the next step, so I keep cooking without touching my phone.
- As Erin, I want an instant swap when I'm missing an ingredient, so the dish doesn't stall.
- As Sam, I want to list what's in my fridge and get a recipe that uses most of it, so I don't have to shop.
- As a cook with an allergy, I want Cheffy to warn me before I start a recipe that conflicts with it.

## 5. User flow and UX notes
1. Open Cheffy (from the home screen) → tap **Start cooking** → allow the mic once.
2. Cheffy: "Hey chef, what are we cooking? Or tell me what's in your fridge."
3. The cook names a dish or lists ingredients (and allergies) → Cheffy says "Let me find a good one" → it runs `find_recipe`.
4. Cheffy names the recipe, its source and the pantry match, and gives any allergy warning first.
5. Ingredient check in groups of three or four → method one step at a time, waiting for "next."
6. Interruptions anytime: "repeat," "go back," "how much X," "I'm out of Y," "I burned it."
7. Tap **End**, or just say goodbye.

**UX principles:** replies of 1–2 sentences; silence means the cook is busy, so Cheffy waits; Cheffy only stops talking once the cook has said about 2 words (so kitchen noise doesn't cut it off); big tap target; colors are warm tomato and cream.

## 6. Release criteria and timeline
**Ships tonight (v0.1) when:** a cook can (a) start a voice session on a phone, (b) get a real recipe from ingredients, (c) step through it with "next" and "repeat," and (d) get a swap, all hands-free over Bluetooth.

| Time | Milestone |
|---|---|
| 6:15pm | Plan and PRD |
| 6:30pm | Tool server, Exa + Jev, and the Vapi assistant live |
| 6:45pm | Phone app with animated Cheffy tested on a real phone |
| 7:05pm | Demo video recorded |
| 7:15pm | Submitted |
| Next 2 weeks | Timers, pantry memory, Thanksgiving multi-dish timeline |

## 7. Potential risks
| Risk | Mitigation |
|---|---|
| Kitchen noise (sizzle, fan, tap) causes mis-hearing or false interruptions | Noise filtering, 2-word interruption setting, earbuds with mic |
| Recipe pages are long and messy | Text shortened server-side; Cheffy says steps in its own words, one at a time |
| Jev slow or unavailable | 1.5-second timeout falls back to Exa's top result |
| Unsafe advice (food safety, allergies, fire) | Hard rules in the prompt: safe temperatures, "check the label," grease-fire guidance |
| Copyright of recipe text | Cheffy credits the source aloud and paraphrases rather than reading pages word for word |
| Call costs on long cooking sessions | 60-minute cap; usage covered by credits for now |

## 8. Non-functional requirements
- **Latency:** first audio reply under about 1.5 s; recipe lookup under about 4 s, covered by "Let me find a good one."
- **Reliability:** every tool returns a usable answer even when a dependency fails.
- **Security:** keys stay server-side in Vercel's private settings; the tool endpoint requires a shared secret; only the public Vapi key reaches the browser.
- **Accessibility:** large type, high contrast, voice-first, works with screen readers.
- **Compatibility:** modern mobile Safari and Chrome; any Bluetooth audio device.

## 9. Assumptions, dependencies and constraints
- **Assumptions:** cooks will grant mic permission; experienced cooks prefer short, direct steps.
- **Dependencies:** Vapi (voice orchestration and web calls), Deepgram (speech to text and voice), Exa (recipe and swap search), TypeSafe Jev (recipe choice, pantry score, allergy check), the AI model behind Vapi (reasoning), Vercel (hosting). Manus was used for the competitor scan and pitch outline, and AdaL for the animated brand clip.
- **Constraints:** built in under 60 minutes; no native app; no Google Home integration (Google shut down third-party Assistant actions), so Bluetooth stands in.

## 10. Evaluation plan and success metrics
| Metric | Target (first 50 sessions) |
|---|---|
| **Hands-free completion:** recipes finished without touching the phone after Start | ≥ 70% |
| Recipe found on the first try (no "find another") | ≥ 80% |
| Swap requests answered usefully | ≥ 90% |
| Wrong "next" advances (the agent misheard) | < 5% of steps |
| Median recipe lookup time | < 4 s |

**How we'll measure it:** Vapi call logs and transcripts (tagged turns), tool server logs (Exa/Jev timing and fallback rate), and a one-question post-call rating ("Would you cook with Cheffy again?").
