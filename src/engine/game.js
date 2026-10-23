// src/engine/game.js | Owner: P1 | Core game logic: place, erase, undo, tick, getState.

(function (root) {
  'use strict';

  // Dependencies (browser globals or Node require)
  var _board  = (typeof module !== 'undefined') ? require('./board.js')  : root;
  var _events = (typeof module !== 'undefined') ? require('./events.js') : root;

  var makeGrid           = _board.makeGrid;
  var boxDims            = _board.boxDims;
  var buildRegions       = _board.buildRegions;
  var isRegionComplete   = _board.isRegionComplete;
  var isRegionValid      = _board.isRegionValid;
  var recomputeConflicts = _board.recomputeConflicts;
  var cloneGrid          = _board.cloneGrid;
  var EventEmitter       = _events.EventEmitter;

  var MAX_HISTORY = 20;

  /**
   * Create a new game from a level definition and option flags.
   *
   * @param {object} level   — entry from Sudolapse.LEVELS
   * @param {object} opts    — { noFade: bool, noStrikes: bool }
   */
  function newGame(level, opts) {
    opts = opts || {};
    var noFade    = !!opts.noFade;
    var noStrikes = !!opts.noStrikes;

    var size    = level.size;
    var dims    = boxDims(size);
    var boxRows = dims.boxRows;
    var boxCols = dims.boxCols;
    var fadeMs  = level.fadeMs;
    var maxStrikes = level.maxStrikes;

    var regions = buildRegions(size, boxRows, boxCols);

    // Build initial grid from puzzle string
    var grid = makeGrid(size);
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        var ch = level.puzzle[r * size + c];
        var v  = parseInt(ch, 10);
        if (v > 0) {
          grid[r][c].value  = v;
          grid[r][c].given  = true;
          grid[r][c].locked = true;
        }
      }
    }

    var emitter  = new EventEmitter();
    var history  = [];          // undo stack of cloned grids
    var strikes  = 0;
    var failed   = false;
    var attempts = 1;
    var moves    = 0;
    var startMs  = null;        // set on first tick after a place
    var elapsedMs = 0;
    var won      = false;
    var pausedAt = null;        // ms when failed (timer stops)

    // ------------------------------------------------------------------ helpers

    function pushHistory() {
      history.push(cloneGrid(grid, size));
      if (history.length > MAX_HISTORY) history.shift();
    }

    /**
     * Check every region that contains (r,c).
     * For each newly complete+valid region, lock all its cells and emit 'lock'.
     */
    function checkLocks(r, c) {
      var regionsToCheck = [
        { type: 'row', index: r,                        region: regions.rows[r]  },
        { type: 'col', index: c,                        region: regions.cols[c]  },
        { type: 'box', index: getBoxIndex(r, c),        region: getBox(r, c)     }
      ];

      for (var i = 0; i < regionsToCheck.length; i++) {
        var entry  = regionsToCheck[i];
        var region = entry.region;

        if (!isRegionComplete(region, grid)) continue;
        if (!isRegionValid(region, grid, size)) continue;

        // Already fully locked? Skip event spam.
        var alreadyLocked = true;
        for (var j = 0; j < region.length; j++) {
          if (!grid[region[j].r][region[j].c].locked) { alreadyLocked = false; break; }
        }
        if (alreadyLocked) continue;

        // Lock every cell in this region
        for (var k = 0; k < region.length; k++) {
          var cell = grid[region[k].r][region[k].c];
          cell.locked  = true;
          cell.fadeAt  = null; // cancel any pending fade
        }
        emitter.emit('lock', { type: entry.type, index: entry.index });
      }
    }

    function getBoxIndex(r, c) {
      var boxesAcross = size / boxCols;
      return Math.floor(r / boxRows) * boxesAcross + Math.floor(c / boxCols);
    }

    function getBox(r, c) {
      return regions.boxes[getBoxIndex(r, c)];
    }

    function checkWin() {
      for (var r = 0; r < size; r++) {
        if (!isRegionComplete(regions.rows[r], grid)) return false;
        if (!isRegionValid(regions.rows[r], grid, size)) return false;
      }
      return true;
    }

    // ------------------------------------------------------------------ public API

    var game = {
      on: function (event, cb) { emitter.on(event, cb); },

      // ---- place -------------------------------------------------------
      place: function (r, c, digit) {
        if (failed) return { ok: false, reason: 'failed' };

        var cell = grid[r][c];
        if (cell.given)  return { ok: false, reason: 'given' };
        if (cell.locked) return { ok: false, reason: 'locked' };

        pushHistory();

        var now = startMs !== null ? (elapsedMs + /* will be updated by tick */ 0) : null;
        // placedAt is the raw wall-clock ms — set by caller via tick; we use
        // a sentinel of -1 to mean "assign on next tick", but simpler: require
        // the UI always calls tick before/after place.  We store Date.now() as
        // a fallback so tests that skip tick still work.
        var nowMs = (typeof performance !== 'undefined' && performance.now)
          ? performance.now() : Date.now();

        cell.value    = digit;
        cell.placedAt = nowMs;
        cell.fadeAt   = noFade ? null : (nowMs + fadeMs);
        cell.locked   = false;
        cell.conflict = false;

        moves += 1;
        if (startMs === null) startMs = nowMs;

        // Conflict detection
        recomputeConflicts(grid, size, regions);
        if (cell.conflict) {
          emitter.emit('conflict', { r: r, c: c });
        }

        emitter.emit('place', { r: r, c: c, digit: digit });

        // Strikes
        var isStrike = false;
        if (!noStrikes && level.solution) {
          var expected = parseInt(level.solution[r * size + c], 10);
          if (digit !== expected) {
            isStrike = true;
            strikes += 1;
            emitter.emit('strike', { strikes: strikes, maxStrikes: maxStrikes, r: r, c: c });
            if (strikes >= maxStrikes) {
              failed   = true;
              pausedAt = nowMs;
              emitter.emit('fail', { attempts: attempts });
              return { ok: true, strike: true };
            }
          }
        }

        // Lock check
        checkLocks(r, c);

        // Win check
        if (!won && checkWin()) {
          won = true;
          emitter.emit('win', {});
        }

        return { ok: true, strike: isStrike };
      },

      // ---- erase -------------------------------------------------------
      erase: function (r, c) {
        if (failed) return { ok: false, reason: 'failed' };
        var cell = grid[r][c];
        if (cell.given)  return { ok: false, reason: 'given' };
        if (cell.locked) return { ok: false, reason: 'locked' };
        if (cell.value === 0) return { ok: false, reason: 'empty' };

        pushHistory();
        cell.value    = 0;
        cell.placedAt = null;
        cell.fadeAt   = null;
        cell.conflict = false;
        recomputeConflicts(grid, size, regions);
        return { ok: true };
      },

      // ---- undo --------------------------------------------------------
      undo: function () {
        if (failed) return { ok: false, reason: 'failed' };
        if (history.length === 0) return { ok: false, reason: 'empty' };
        grid = history.pop();
        recomputeConflicts(grid, size, regions);
        return { ok: true };
      },

      // ---- restart -----------------------------------------------------
      restart: function () {
        attempts += 1;
        strikes   = 0;
        failed    = false;
        moves     = 0;
        elapsedMs = 0;
        startMs   = null;
        pausedAt  = null;
        won       = false;
        history   = [];

        grid = makeGrid(size);
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var ch = level.puzzle[r * size + c];
            var v  = parseInt(ch, 10);
            if (v > 0) {
              grid[r][c].value  = v;
              grid[r][c].given  = true;
              grid[r][c].locked = true;
            }
          }
        }
      },

      // ---- tick --------------------------------------------------------
      tick: function (nowMs) {
        if (failed) return;
        if (won)    return;

        // Advance elapsed timer
        if (startMs !== null) {
          elapsedMs = nowMs - startMs;
        }

        if (noFade) return;

        var faded = false;
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var cell = grid[r][c];
            if (cell.fadeAt !== null && nowMs >= cell.fadeAt) {
              cell.value    = 0;
              cell.placedAt = null;
              cell.fadeAt   = null;
              cell.conflict = false;
              emitter.emit('fade', { r: r, c: c });
              faded = true;
            }
          }
        }

        if (faded) {
          recomputeConflicts(grid, size, regions);
        }
      },

      // ---- getState ----------------------------------------------------
      getState: function () {
        // Return a deep snapshot so callers can't mutate internals
        return {
          size:       size,
          boxRows:    boxRows,
          boxCols:    boxCols,
          grid:       cloneGrid(grid, size),
          fadeMs:     fadeMs,
          moves:      moves,
          elapsedMs:  elapsedMs,
          won:        won,
          strikes:    strikes,
          maxStrikes: maxStrikes,
          failed:     failed,
          attempts:   attempts
        };
      }
    };

    return game;
  }

  // Attach to global or export for Node
  if (typeof module !== 'undefined') {
    module.exports = { newGame: newGame };
  } else {
    root.Sudolapse = root.Sudolapse || {};
    root.Sudolapse._newGame = newGame;
  }

}(typeof globalThis !== 'undefined' ? globalThis : this));
