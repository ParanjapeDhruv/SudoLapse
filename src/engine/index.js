// src/engine/index.js | Owner: P1 | Assembles engine exports onto the global Sudolapse object.

(function (root) {
  'use strict';

  // In Node, pull in dependencies explicitly.
  // In the browser these are already on `root` (window) via <script> tags.
  var _game = (typeof module !== 'undefined') ? require('./game.js') : root;
  var _stub = (typeof module !== 'undefined') ? require('./stub.js') : root;

  var _newGame     = _game.newGame      || (root.Sudolapse && root.Sudolapse._newGame);
  var _newStubGame = _stub.newStubGame  || (root.Sudolapse && root.Sudolapse._newStubGame);

  /**
   * Read ?nofade=1 and ?nostrikes=1 from the current URL.
   * Returns { noFade, noStrikes }.  Safe to call in Node (returns false for both).
   */
  function readUrlOpts() {
    if (typeof location === 'undefined' || !location.search) {
      return { noFade: false, noStrikes: false };
    }
    var params = location.search;
    return {
      noFade:    params.indexOf('nofade=1')    !== -1,
      noStrikes: params.indexOf('nostrikes=1') !== -1
    };
  }

  /**
   * Public factory.  levelIndex is 0-based into Sudolapse.LEVELS.
   * opts (optional) override URL params — useful for tests.
   */
  function newGame(levelIndex, opts) {
    var urlOpts = readUrlOpts();
    var merged  = {
      noFade:    (opts && opts.noFade    !== undefined) ? opts.noFade    : urlOpts.noFade,
      noStrikes: (opts && opts.noStrikes !== undefined) ? opts.noStrikes : urlOpts.noStrikes
    };

    var levels = (typeof Sudolapse !== 'undefined' && Sudolapse.LEVELS)
      ? Sudolapse.LEVELS
      : (root.Sudolapse && root.Sudolapse.LEVELS) || [];

    var level = levels[levelIndex];
    if (!level) throw new Error('Sudolapse.newGame: no level at index ' + levelIndex);

    return _newGame(level, merged);
  }

  // Assemble the public Sudolapse namespace
  var Sudolapse = root.Sudolapse || {};
  Sudolapse.newGame    = newGame;
  Sudolapse.readUrlOpts = readUrlOpts;
  // LEVELS is populated by levels.js (loaded after index.js in the browser,
  // or attached externally in Node).  We initialise to [] as a safe default.
  if (!Sudolapse.LEVELS) Sudolapse.LEVELS = [];

  root.Sudolapse = Sudolapse;

  if (typeof module !== 'undefined') {
    module.exports = {
      newGame:      newGame,
      readUrlOpts:  readUrlOpts,
      // expose internals for tests
      _newGame:     _newGame,
      _newStubGame: _newStubGame
    };
  }

}(typeof globalThis !== 'undefined' ? globalThis : this));
