---
inclusion: always
---

# Sudolapse — Workflow Rules

## Commits

- Commit after every working version, not in the middle of a broken state.
- Keep commits small and focused: one logical change per commit.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- Pull before push. Never force-push to a shared branch.
- Read every diff before committing. Do not commit commented-out code, debug logs,
  or leftover TODOs unless they are intentional and noted.

## File Discipline

- **Never regenerate or overwrite a file that already has working code.** Patch it instead.
- Never create, edit, or delete a file you do not own (see `structure.md`).
- If you need a change in a file you do not own, describe it in your reply; do not touch the file.
- **Ask before adding any file or dependency not listed in `structure.md`.**
- Do not introduce npm runtime dependencies. `package.json` has scripts only.

## Puzzle Integrity

- Verify every puzzle with the solver (`node tools/check_levels.js`) before committing
  any change to `src/levels/levels.js`.
- A puzzle that does not have exactly one solution must never be committed.

## AI Log

- `AI_LOG.md` records only real events: decisions made, bugs found, non-obvious changes.
- Do not fill it with summaries of routine edits or auto-generated content.
- One entry per meaningful event, dated, with a brief rationale.

## General

- `node --test tests/` must pass before any commit that touches P1 files.
- `node tools/check_levels.js` must pass before any commit that touches `src/levels/levels.js`.
- When in doubt about scope, ask the user rather than guessing and over-building.
- Do not start a new task until the current one is committed and passing.
