---
inclusion: always
---

# Sudolapse — Engine & Audio Contract

This is the shared interface between the engine (P1), the UI (P2), and audio (P3).
Never change this contract without updating all three owners.

## Engine API (`global Sudolapse`)

### `Sudolapse.newGame(levelIndex)` → `game`

Creates and returns a new game instance for the level at `Sudolapse.LEVELS[levelIndex]`.

### `game.place(r, c, digit)` → `{ ok, reason, strike }`

Places `digit` at row `r`, column `c` (0-indexed).
- Rejects given cells and locked cells (returns `ok: false`).
- Returns `reason: 'failed'` if the game is already in a failed state.
- Sets `strike: true` if the digit differs from the solution.

### `game.erase(r, c)`

Erases a player-placed, non-locked cell. No-ops on given or locked cells.

### `game.undo()`

Restores the previous board state. Keeps a history of the last 20 states.
Never refunds strikes.

### `game.restart()`

Resets to the original puzzle: grid cleared, strikes reset to 0, timer reset, `attempts` incremented.
Called by the UI on Retry after a fail.

### `game.tick(nowMs)`

Called by the UI every animation frame with the current timestamp (`performance.now()` or
`Date.now()`). Handles fade expiry. Never use `setTimeout`/`setInterval` for fading.

### `game.getState()` → state object

```js
{
  size,          // N (4, 6, or 9)
  boxRows,       // rows per box
  boxCols,       // cols per box
  grid,          // size×size array of cell objects (see below)
  fadeMs,        // fade duration in ms
  moves,         // total placed digits this attempt
  elapsedMs,     // time elapsed this attempt
  won,           // boolean
  strikes,       // [STRIKES] current strike count
  maxStrikes,    // [STRIKES] limit before fail
  failed,        // [STRIKES] boolean
  attempts       // [STRIKES] how many times restarted (starts at 1)
}
```

Each cell in `grid[r][c]`:

```js
{
  value,     // 0 = empty, 1–N = digit
  given,     // boolean — pre-filled clue, never fades
  locked,    // boolean — permanently placed, never fades
  placedAt,  // ms timestamp when placed (null if empty/given)
  fadeAt,    // ms timestamp when this cell will fade (null if not fading)
  conflict   // boolean — true if this cell currently conflicts with another
}
```

### `game.on(event, callback)`

Registers an event listener. Events:

| Event | Payload | When |
|-------|---------|------|
| `'place'` | `{ r, c, digit }` | A digit is successfully placed |
| `'fade'` | `{ r, c }` | A cell fades (digit erased by timer) |
| `'lock'` | `{ type: 'row'\|'col'\|'box', index }` | A region is locked |
| `'conflict'` | `{ r, c }` | A cell enters a conflict state |
| `'win'` | `{}` | The puzzle is solved |
| `'strike'` | `{ strikes, maxStrikes, r, c }` | A strike is recorded |
| `'fail'` | `{ attempts }` | `strikes === maxStrikes`; game is now failed |

## `Sudolapse.LEVELS`

Array of level definition objects:

```js
{
  name,       // string
  size,       // 4, 6, or 9
  boxRows,    // rows per box (2 for size-4 and size-6, 3 for size-9)
  boxCols,    // cols per box (2 for size-4, 3 for size-6 and size-9)
  fadeMs,     // fade duration in ms
  maxStrikes, // strike limit
  puzzle,     // string of size*size chars; '0' = empty cell
  solution    // string of size*size chars; complete valid solution
}
```

- `puzzle` and `solution` contain only digit characters and `'0'`.
- Every puzzle must have **exactly one solution** (verified by the solver).
- Size 4 → boxes 2×2. Size 6 → boxes 2 rows × 3 cols. Size 9 → boxes 3×3.
- **Never hardcode size 9.** Always derive from the level definition.

## URL Parameters

Read once at startup by the UI and passed into `Sudolapse.newGame`:

- `?nofade=1` — disables fading; placed digits stay until erased.
- `?nostrikes=1` — disables strike counting.

## Audio API (`global Sfx`)

**The global must be named `Sfx`, never `Audio`** (collides with the browser built-in).

### `Sfx.play(soundName)`

Plays a one-shot sound effect. Valid names:

`'place'` | `'fade'` | `'lock'` | `'conflict'` | `'win'` | `'click'` | `'strike'` | `'fail'`

### `Sfx.music(trackName)`

Starts or switches background music. Valid names: `'menu'` | `'game'`

### `Sfx.mute(bool)`

Mutes (`true`) or unmutes (`false`) all audio output.

## Layering Rules

- The **engine** never calls the UI or `Sfx`. It only emits events.
- The **UI** calls the engine and calls `Sfx` in response to engine events.
- The **audio** layer (`Sfx`) has no knowledge of game state.
