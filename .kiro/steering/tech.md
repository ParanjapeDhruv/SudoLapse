---
inclusion: always
---

# Sudolapse — Technical Constraints

## Stack

- Vanilla HTML, CSS, and JavaScript **only**.
- No frameworks, no build step, no backend, no API keys, no npm runtime dependencies.
- Must open and play from `index.html` over a `file://` URL without any local server.

## Script Loading

- Use classic `<script src="...">` tags. **No ES modules** (`type="module"` is forbidden).
- Script order in `index.html` must be exactly:
  1. `src/engine/events.js`
  2. `src/engine/board.js`
  3. `src/engine/game.js` (use `stub.js` in its place until `game.js` is implemented)
  4. `src/levels/levels.js`
  5. `src/engine/index.js`
  6. `src/audio/audio.js`
  7. `src/ui/boardRenderer.js`
  8. `src/ui/input.js`
  9. `src/ui/effects.js`
  10. `src/ui/screens/title.js`
  11. `src/ui/screens/levelSelect.js`
  12. `src/ui/screens/game.js`
  13. `src/ui/screens/win.js`
  14. `src/ui/app.js`

## Global Namespaces

- Engine API lives on the global `Sudolapse` object (set by `src/engine/index.js`).
- Audio API lives on the global `Sfx` object (set by `src/audio/audio.js`).
- **Never name the audio global `Audio`** — it collides with the browser built-in `Audio` constructor.

## Node Compatibility (for tests and tools)

- Every file under `src/engine/`, `src/levels/`, and `src/solver/` must be loadable in Node.
- Guard exports with:
  ```js
  if (typeof module !== 'undefined') module.exports = ...;
  ```
- These files must not reference `window`, `document`, or any DOM API.

## Grid Size

- **Never hardcode the grid size as `9`.**
- Always derive size from the level definition (`level.size`, `game.size`, etc.).
- Box dimensions come from `boxRows` and `boxCols` (e.g. 2×3 for size-6 grids).

## Fading

- Fading is driven by `game.tick(nowMs)`, called every animation frame by the UI.
- **Never use `setTimeout` or `setInterval` to trigger fading.** All timing is relative to
  `placedAt` and the current `nowMs` passed to `tick`.

## URL Parameters

- `?nofade=1` — disables fading for the entire session (digits stay until erased).
- `?nostrikes=1` — disables strike counting for the entire session.
- Both are read once at startup and passed into `Sudolapse.newGame`.
