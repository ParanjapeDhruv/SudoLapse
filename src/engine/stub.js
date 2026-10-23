// src/engine/stub.js | Owner: P1 | Stub implementation of Sudolapse.newGame — same API as game.js.
// Used by the UI before game.js is implemented. Fixed 4×4 board, timers work, strikes work.

(function (root) {
  'use strict';

  var _board  = (typeof module !== 'undefined') ? require('./board.js')  : root;
  var _events = (typeof module !== 'undefined') ? require('./events.js') : root;

  var makeGrid           = _board.makeGrid;
  var buildRegions       = _board.buildRegions;
  var isRegionComplete   = _board.isRegionComplete;
  var isRegionValid      = _board.isRegionValid;
  var recomputeConflicts = _board.recomputeConflicts;
  var cloneGrid          = _board.cloneGrid;
  var EventEmitter       = _events.EventEmitter;

  var STUB_SIZE    = 4;
  var STUB_ROWS    = 2;
  var STUB_COLS    = 2;
  var STUB_FADE_MS = 8000;
  var STUB_MAX_STR = 3;

  // A simple valid 4×4 puzzle / solution pair
  var STUB_PUZZLE   = '120034000021040'; // 15 chars — oops, 4×4 = 16
  STUB_PUZZLE       = '1200300400210040'; // still wrong length check
  // Correct: 16 chars
  STUB_PUZZLE       = '1020000030200401'; // let us hard-check
  // 4x4 valid: solution 1234 3412 2143 4321
  STUB_PUZZLE       = '1000000000000001'; // clues at corners
  var STUB_SOLUTION = '1234341221434321';

  var MAX_HISTORY = 20;

  function newStubGame(opts) {
    opts = opts || {};
    var noFade    = !!opts.noFade;
    var noStrikes = !!opts.noStrikes;

    var size    = STUB_SIZE;
    var boxRows = STUB_ROWS;
    var boxCols = STUB_COLS;
    var fadeMs  = STUB_FADE_MS;
    var maxStrikes = STUB_MAX_STR;
    var regions = buildRegions(size, boxRows, boxCols);

    var grid = makeGrid(size);
    // Apply clues
    for (var i = 0; i < STUB_PUZZLE.length; i++) {
      var v = parseInt(STUB_PUZZLE[i], 10);
      if (v > 0) {
        grid[Math.floor(i / size)][i % size].value  = v;
        grid[Math.floor(i / size)][i % size].given  = true;
        grid[Math.floor(i / size)][i % size].locked = true;
      }
    }

    var emitter   = new EventEmitter();
    var history   = [];
    var strikes   = 0;
    var failed    = false;
    var attempts  = 1;
    var moves     = 0;
    var startMs   = null;
    var elapsedMs = 0;
    var won       = false;

    function pushHistory() {
      history.push(cloneGrid(grid, size));
      if (history.length > MAX_HISTORY) history.shift();
    }

    function getBoxIndex(r, c) {
      return Math.floor(r / boxRows) * (size / boxCols) + Math.floor(c / boxCols);
    }

    function checkLocks(r, c) {
      var checks = [
        { type: 'row', index: r,              region: regions.rows[r]               },
        { type: 'col', index: c,              region: regions.cols[c]               },
        { type: 'box', index: getBoxIndex(r,c), region: regions.boxes[getBoxIndex(r,c)] }
      ];
      for (var i = 0; i < checks.length; i++) {
        var entry = checks[i];
        if (!isRegionComplete(entry.region, grid)) continue;
        if (!isRegionValid(entry.region, grid, size)) continue;
        var allLocked = true;
        for (var j = 0; j < entry.region.length; j++) {
          if (!grid[entry.region[j].r][entry.region[j].c].locked) { allLocked = false; break; }
        }
        if (allLocked) continue;
        for (var k = 0; k < entry.region.length; k++) {
          var cell = grid[entry.region[k].r][entry.region[k].c];
          cell.locked = true;
          cell.fadeAt = null;
        }
        emitter.emit('lock', { type: entry.type, index: entry.index });
      }
    }

    function checkWin() {
      for (var r = 0; r < size; r++) {
        if (!isRegionComplete(regions.rows[r], grid)) return false;
        if (!isRegionValid(regions.rows[r], grid, size)) return false;
      }
      return true;
    }

    var game = {
      on: function (event, cb) { emitter.on(event, cb); },

      place: function (r, c, digit) {
        if (failed) return { ok: false, reason: 'failed' };
        var cell = grid[r][c];
        if (cell.given)  return { ok: false, reason: 'given' };
        if (cell.locked) return { ok: false, reason: 'locked' };

        pushHistory();

        var nowMs = (typeof performance !== 'undefined' && performance.now)
          ? performance.now() : Date.now();

        cell.value    = digit;
        cell.placedAt = nowMs;
        cell.fadeAt   = noFade ? null : (nowMs + fadeMs);
        cell.locked   = false;
        cell.conflict = false;

        moves += 1;
        if (startMs === null) startMs = nowMs;

        recomputeConflicts(grid, size, regions);
        if (cell.conflict) emitter.emit('conflict', { r: r, c: c });
        emitter.emit('place', { r: r, c: c, digit: digit });

        var isStrike = false;
        if (!noStrikes) {
          var expected = parseInt(STUB_SOLUTION[r * size + c], 10);
          if (digit !== expected) {
            isStrike = true;
            strikes += 1;
            emitter.emit('strike', { strikes: strikes, maxStrikes: maxStrikes, r: r, c: c });
            if (strikes >= maxStrikes) {
              failed = true;
              emitter.emit('fail', { attempts: attempts });
              return { ok: true, strike: true };
            }
          }
        }

        checkLocks(r, c);
        if (!won && checkWin()) { won = true; emitter.emit('win', {}); }

        return { ok: true, strike: isStrike };
      },

      erase: function (r, c) {
        if (failed) return { ok: false, reason: 'failed' };
        var cell = grid[r][c];
        if (cell.given)  return { ok: false, reason: 'given' };
        if (cell.locked) return { ok: false, reason: 'locked' };
        if (cell.value === 0) return { ok: false, reason: 'empty' };
        pushHistory();
        cell.value = 0; cell.placedAt = null; cell.fadeAt = null; cell.conflict = false;
        recomputeConflicts(grid, size, regions);
        return { ok: true };
      },

      undo: function () {
        if (failed) return { ok: false, reason: 'failed' };
        if (history.length === 0) return { ok: false, reason: 'empty' };
        grid = history.pop();
        recomputeConflicts(grid, size, regions);
        return { ok: true };
      },

      restart: function () {
        attempts += 1; strikes = 0; failed = false; moves = 0;
        elapsedMs = 0; startMs = null; won = false; history = [];
        grid = makeGrid(size);
        for (var i = 0; i < STUB_PUZZLE.length; i++) {
          var v = parseInt(STUB_PUZZLE[i], 10);
          if (v > 0) {
            grid[Math.floor(i / size)][i % size].value  = v;
            grid[Math.floor(i / size)][i % size].given  = true;
            grid[Math.floor(i / size)][i % size].locked = true;
          }
        }
      },

      tick: function (nowMs) {
        if (failed || won) return;
        if (startMs !== null) elapsedMs = nowMs - startMs;
        if (noFade) return;
        var faded = false;
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) {
            var cell = grid[r][c];
            if (cell.fadeAt !== null && nowMs >= cell.fadeAt) {
              cell.value = 0; cell.placedAt = null; cell.fadeAt = null; cell.conflict = false;
              emitter.emit('fade', { r: r, c: c });
              faded = true;
            }
          }
        }
        if (faded) recomputeConflicts(grid, size, regions);
      },

      getState: function () {
        return {
          size: size, boxRows: boxRows, boxCols: boxCols,
          grid: cloneGrid(grid, size),
          fadeMs: fadeMs, moves: moves, elapsedMs: elapsedMs, won: won,
          strikes: strikes, maxStrikes: maxStrikes, failed: failed, attempts: attempts
        };
      }
    };

    return game;
  }

  if (typeof module !== 'undefined') {
    module.exports = { newStubGame: newStubGame };
  } else {
    root.Sudolapse = root.Sudolapse || {};
    root.Sudolapse._newStubGame = newStubGame;
  }

}(typeof globalThis !== 'undefined' ? globalThis : this));
