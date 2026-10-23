---
inclusion: always
---

# Sudolapse — Product Rules

**Tagline:** A sudoku where your digits don't stay.

## Base Game

Standard Sudoku on a grid of size N (4, 6, or 9). The player fills empty cells with digits 1–N
following the usual rules: each digit appears exactly once in every row, column, and box.

## The Fade Twist

Every digit the player places starts a countdown of `fadeMs` milliseconds. When the timer
expires the digit fades (is erased from the grid) — **unless** its row, column, or box has
become complete and valid, which triggers a lock (see below).

## The Lock Rule

When any row, column, or box is completed with all correct digits, every cell in that region
is **locked permanently**. Locked cells cannot be erased or overwritten and never fade.
Given clues (pre-filled cells) never fade and are always considered locked.

## Strikes (3-Strike Restart Rule)

- A **strike** is recorded whenever a placed digit differs from the hidden solution.
- Undo, erase, and fade never refund strikes.
- When `strikes === maxStrikes` the attempt **fails**: the level restarts from the original
  puzzle with the grid reset, strikes reset to 0, timer reset, and `attempts` incremented.
- `fail` does not auto-restart. The UI shows a fail overlay and calls `game.restart()` on Retry.

## Level Table

| # | Name         | Size | fadeMs | maxStrikes |
|---|--------------|------|--------|------------|
| 1 | Warmup       | 4×4  | 12000  | 5          |
| 2 | Quick 4      | 4×4  | 8000   | 3          |
| 3 | Easy Six     | 6×6  | 15000  | 3          |
| 4 | Ticking Six  | 6×6  | 10000  | 3          |
| 5 | Classic      | 9×9  | 15000  | 4          |
| 6 | Speedrun     | 9×9  | 9000   | 4          |

## PS3 Must-Haves

- Runs from a local `index.html` (file:// URL, no server).
- Title screen shows the rules and the fade twist.
- 6 playable levels across all three grid sizes.
- A solver verifies every puzzle has exactly one solution.
- Win screen and fail-with-Retry overlay both work.
- Strike counter visible at all times during play.

## Acceptance Checklist

- [ ] Opens and plays from `index.html` over `file://` with no console errors.
- [ ] Title screen explains the rules and the fade twist.
- [ ] All 6 levels are selectable and playable.
- [ ] `node --test tests/` passes.
- [ ] `node tools/check_levels.js` passes (solver verifies every puzzle).
- [ ] Win screen appears on completion; level-select returns correctly.
- [ ] Strike fail overlay appears at `maxStrikes`; Retry resets the puzzle correctly.
- [ ] URL param `?nofade=1` disables fading; `?nostrikes=1` disables strikes.
