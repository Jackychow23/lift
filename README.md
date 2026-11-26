# Lift

A strength log for Jacky's phone. It works offline at the gym, shows today's workout, logs weight and reps, runs the rest timer with Spanish flashcards, and gets each next workout from Claude whenever there's signal.

## Getting it onto the phone

The app has to be hosted on an `https://` address once. After the first visit it runs from the phone, with or without signal.

### Option A: GitHub Pages (free; the setup file is included)

1. Create a new GitHub repository (e.g. `lift`) and push this folder to its `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow builds and publishes the app. After a minute or two it's at
   `https://<your-username>.github.io/lift/`.

### Option B: Vercel or Netlify

Import the repo. Use build command `npm run build` and output folder `dist`. No other settings are needed.

### Install it on the Galaxy S24

1. Open the address in **Chrome** on the phone.
2. Tap **⋮ → Add to home screen → Install**.
3. Open Lift from the home screen once while online, so it saves itself for offline use.

## Turning on Claude

1. Go to **console.anthropic.com**, create an API key, and set a monthly spend limit (a few dollars is plenty).
2. In the app, open **Settings**, paste the key, and tap **Test connection**.

The key stays on the phone. It's never put in backups and never sent anywhere except Anthropic's API.

### When Claude writes plans

- Right after a workout, if there's signal.
- Otherwise, the next time the app is opened with signal.
- Until then there's always a built-in plan, so the app never gets stuck.
- A plan stays on screen until it's done. A new one replaces the built-in plan only if that workout hasn't been started yet.

## How the training works

- **Calibration (first 8 workouts):** weights start light and climb faster while the app finds your working weights. After that, Claude writes a short weak-points note on the Progress screen and refreshes it monthly.
- **Weekly schedule:** the plan follows the week. By default:
  - Monday: Upper A (bench + row), heavy
  - Tuesday: Upper B (overhead press + pulldown), heavy
  - Wednesday: Upper A, light (third day in a row: about 10–15% lighter, a few more reps)
  - Thursday: Upper B, light
  - Friday: optional; the weekend is rest

  Pick other days in **Settings → Training days**. Heavy/light follows the days you actually train in a row, so a rest day makes the next one heavy again. Progression only counts heavy days.
- **Missed a day:** the next training day picks up where you left off (miss Wednesday and Thursday gets Wednesday's workout). If one is still left when the week's days run out, Friday–Sunday offers it as an optional catch-up (tap **Not this week** to hide it, e.g. when travelling). Every Monday starts a fresh week. The strip on the Today screen shows the week: ✓ done, the next workout highlighted, then what's planned (L = light).
- **Time limit:** every plan is built to fit **Settings → Workout length** (30 min by default), counting set-up, your warm-up sets, each set and the rests; accessories are cut first if it won't fit. During a workout the top bar shows time left, and a note appears if you're running long.
- **One exercise at a time:** finish all sets of an exercise, then move on. The rests are longer (about 2½ min for main lifts, 75 s for accessories, 30–45 s for posture work), which is time for the Spanish cards.
- **Equipment order:** dumbbell/bench work first, then the pulldown/row machine (lat pulldown, seated row), then the cable machine, so you never walk back. Claude's plans are put in that order too.
- **Pulldown/row machine:** the Precor pulldown/seated row machine is its own station with its own weights (5 lb steps up to 225 by default: 10 lb plates plus the 5 lb add-on lever). Change them, or turn the machine off, in **Settings → Gym equipment**.
- **Swapping:** the swap list always shows cable options first, then dumbbell ones. Floor work (push-ups, floor press) is left out unless you switch it on in Settings.
- **Cable machine taken:** one button in the workout swaps every cable exercise you haven't started for a dumbbell one (the pulldown/row machine is separate, so it stays). Tap it again to swap back.
- **Notes:** at the bottom of the workout screen. A note is saved on the phone right away, tagged with the exercise and set you were on. The coach reads recent notes when it writes the next plan (pain → it swaps or lightens that movement). Notes can also be sent to a **private** GitHub repo (default `Jackychow23/lift-notes`) as issues, as soon as the phone is online, so Claude in chat can read them. This repo is public, so notes never go here: the app refuses a public repo. Setup, once:
  1. Create a private repo named `lift-notes` (github.com/new → Private).
  2. Make a fine-grained token (github.com/settings/personal-access-tokens/new): only `lift-notes`, permission **Issues: Read and write**.
  3. Paste it in **Settings → Notes** and tap **Test**. The token stays on the phone and is left out of backups.
  4. For Claude in chat to read the notes, give the Claude GitHub app access to `lift-notes` too.

  **Copy recent notes** in Settings copies them for pasting into a chat without any of this.
- **Timed holds (chin tucks):** tap the check (or “Start set … with the hold timer”). In Automatic mode you tap Start once: one buzz = hold, two buzzes = relax, and it counts the reps and logs the set. “Tap each rep” starts each hold when you tap instead.
- **Rest screen:** besides the Spanish card, it has buttons for the form notes of the exercise you just did and the next one.
- **Bonus day:** once the week's workouts are done, an optional bonus repeats that week's weakest workout with the same targets.
- **Progression:**
  - Beat the top of the rep range → the weight goes up.
  - Hit the target → same weight, one more rep next time.
  - Drop the weight mid-workout → the plan follows the weight you actually used.
  - At the 50 lb dumbbells → it adds reps and slower lowering instead of weight.
- **Safety rails:** Claude's plans are checked before they're used:
  - only known exercises and equipment you have
  - real dumbbell and stack weights
  - weight never jumps more than one step (two during calibration) over what you last lifted
  - about 16 working sets at most
- **Posture check:** monthly. A timed neck hold and a wall test, tracked on Progress.

## Spanish cards

- Each card teaches a word inside a short sentence, as multiple choice. Every built-in word has a memory hook (e.g. mano → manual); tap **Hint** to see it first. A right answer after a hint doesn't move the card up.
- The same word shows up in different sentences on later reviews: other deck sentences that use it, plus new ones Claude writes.
- Question types rotate: what the word means, fill in the blank, what the whole sentence means, and how to say it in Spanish.
- Every few cards, a 2–3 sentence mini-story (written by Claude from words you know, saved for offline) checks real reading.
- Missed cards come back within minutes; known ones come back days or weeks later.
- New words arrive only while recent accuracy is good.
- **Hear it:** the speaker button reads the Spanish out loud with the phone's own voice (tap again for slower). Before answering it's there for the word and sentence questions (not fill-in-the-blank, which would give it away); after answering, for the word and the sentence. It works offline once a Spanish voice is installed on the phone: **Settings → General management → Text-to-speech** → the engine's settings → install Spanish (Mexico or US). **Settings → Rest timer + Spanish** shows which voice it's using and has a Test button.
- Cards move on from "what does this word mean" to "what does this sentence mean" to "how do you say it in Spanish".
- When the built-in deck of 126 cards runs low, Claude writes new ones at your level.

## Changing things (it's meant to evolve)

| To change | Edit |
|---|---|
| Goals, likes/dislikes, injuries (what Claude reads) | In the app: **Settings → About me** |
| Training days | In the app: **Settings → Training days** |
| Dumbbells, cable and machine steps, attachments, legs on/off | In the app: **Settings → Gym equipment** |
| Where notes are sent | In the app: **Settings → Notes** |
| Exercises, how-to notes, "feel it here / not here" | `src/data/exercises.ts` (photos go in `public/exercises/<id>/0.webp` and `1.webp`) |
| Spanish starter deck | `src/data/spanish.ts` |
| Built-in A/B workouts, weekly schedule, light-day rules, progression, safety rails | `src/lib/planner.ts` |
| What Claude is told when planning | `src/lib/claude.ts` (`COACH_SYSTEM`) |
| Calibration length, default model | `src/lib/defaults.ts` |
| Colors and layout | `src/styles.css` |

## Backups

All data lives on the phone (IndexedDB). Use **Settings → Save backup** now and then, especially before switching phones or clearing Chrome's data. **Restore backup** loads that file back in.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # planner, guardrails and flashcard tests
npm run build    # production build in dist/
```

Exercise photos are from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain). The chin-tuck drawings were made for this app.
