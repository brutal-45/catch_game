# ✦ Catch The Swarm

A polished, dependency-free reaction arcade game. Pick a target, survive as long as possible, and build a streak before the swarm gets away.

## Play

Open `index.html` in a modern browser, or serve the folder locally:

```bash
python3 -m http.server 4173
```

Then visit <http://localhost:4173>.

## How it works

1. Choose an intensity: **Warm up**, **Lock in**, **Overdrive**, or **Unfair**.
2. Choose one of six targets. Each target has a different base score and personality.
3. Click or tap targets before their ring closes.
4. Catch targets in a row to charge the streak multiplier. Every 15 seconds brings a faster wave.
5. Grab power-ups when they appear:
   - **Double score** doubles points for 10 seconds.
   - **Shield** absorbs one missed target for 15 seconds.
6. You have three lives. When they are gone, the run ends.

### Controls

- Pointer, mouse, or touch: catch targets and power-ups
- `Space`: pause or resume
- `Escape`: pause during a run
- Pause and sound controls are also available in the game HUD

## Highlights

- Responsive neon arcade interface for desktop and mobile
- Six target choices using local emoji assets, so the game works offline
- Four escalating difficulty modes and pressure waves
- Streak multipliers, milestone bonuses, power-ups, particles, floating score feedback, and confetti
- Pause that freezes timers and target animation correctly
- Accurate run recap with score, high score, streak, catches, accuracy, and time played
- 13 run achievements with local unlock persistence
- Local high-score and sound-preference persistence
- Defensive Web Audio handling: sound is generated when supported and never blocks gameplay
- Reduced-motion support and keyboard-friendly controls
- No external dependencies or build step

## Project files

- `index.html` — screens, HUD, overlays, and accessible game controls
- `style.css` — responsive neon arcade presentation and animations
- `script.js` — game loop, scoring, power-ups, achievements, audio, and persistence

## Browser support

Works in current Chrome, Firefox, Safari, and Edge releases. JavaScript and a browser with Pointer Events are recommended; mouse clicks and keyboard activation are supported as fallbacks.
