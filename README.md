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
- **Days:** Upper A (bench + row) and Upper B (overhead press + pulldown) alternate, 4–5 days a week. About 12 working sets, roughly 30–35 minutes.
- **One exercise at a time:** finish all sets of an exercise, then move on. The rests are longer (about 2½ min for main lifts, 75 s for accessories, 30–45 s for posture work), which is time for the Spanish cards.
- **Equipment order:** all the dumbbell/bench work comes first, then everything at the cable machine, so you never walk back to the benches. Claude's plans are put in that order too.
- **Swapping:** the swap list always shows cable options first, then dumbbell ones. Floor work (push-ups, floor press) is left out unless you switch it on in Settings.
- **Cable machine taken:** one button in the workout swaps every cable exercise you haven't started for a dumbbell one. Tap it again to swap back.
- **Rest screen:** besides the Spanish card, it has buttons for the form notes of the exercise you just did and the next one.
- **Bonus day:** after 4 workouts in a week (Mon–Sun), an optional bonus repeats that week's weakest workout with the same targets.
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
- Cards move on from "what does this word mean" to "what does this sentence mean" to "how do you say it in Spanish".
- When the built-in deck of 126 cards runs low, Claude writes new ones at your level.

## Changing things (it's meant to evolve)

| To change | Edit |
|---|---|
| Goals, likes/dislikes, injuries (what Claude reads) | In the app: **Settings → About me** |
| Dumbbells, cable steps, attachments, legs on/off | In the app: **Settings → Gym equipment** |
| Exercises, how-to notes, "feel it here / not here" | `src/data/exercises.ts` (photos go in `public/exercises/<id>/0.webp` and `1.webp`) |
| Spanish starter deck | `src/data/spanish.ts` |
| Built-in A/B workouts, progression rules, safety rails | `src/lib/planner.ts` |
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
