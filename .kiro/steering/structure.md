---
inclusion: always
---

# Sudolapse — File Structure & Ownership

## Directory Tree

```
sudolapse/
├── index.html
├── README.md
├── AI_LOG.md
├── context.md
├── package.json
├── .gitignore
├── src/
│   ├── engine/
│   │   ├── events.js
│   │   ├── board.js
│   │   ├── game.js
│   │   ├── stub.js
│   │   └── index.js
│   ├── levels/
│   │   └── levels.js
│   ├── solver/
│   │   └── solver.js
│   ├── ui/
│   │   ├── app.js
│   │   ├── boardRenderer.js
│   │   ├── input.js
│   │   ├── effects.js
│   │   └── screens/
│   │       ├── title.js
│   │       ├── levelSelect.js
│   │       ├── game.js
│   │       └── win.js
│   └── audio/
│       └── audio.js
├── styles/
│   ├── tokens.css
│   ├── layout.css
│   ├── board.css
│   ├── screens.css
│   └── animations.css
├── assets/
│   ├── audio/
│   ├── fonts/
│   └── images/
├── design/
│   └── stitch/
├── tools/
│   └── check_levels.js
├── tests/
│   ├── board.test.js
│   ├── fade_lock.test.js
│   ├── undo.test.js
│   ├── levels.test.js
│   └── strikes.test.js
└── .kiro/
    └── steering/
        ├── product.md
        ├── tech.md
        ├── structure.md
        ├── contract.md
        └── workflow.md
```

## Ownership Table

| Owner | Files |
|-------|-------|
| **P1** | `src/engine/*`, `src/levels/*`, `src/solver/*`, `tools/*`, `tests/*` |
| **P2** | `index.html`, `src/ui/*`, `styles/*`, `design/stitch/*` |
| **P3** | `src/audio/*`, `assets/audio/*`, `README.md`, `AI_LOG.md` |

## Ownership Rule

**Never create, edit, or delete a file you do not own.**

If a task requires a change in a file owned by another party, describe the needed change
in your reply instead of making it directly. The owning party is responsible for applying it.

Do not add new files or directories not listed in this tree without first asking the user.
Ask before introducing any file or dependency not already present in this structure.
