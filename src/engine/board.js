// src/engine/board.js | Owner: P1 | Board data-structure: cells, regions, validity checks.

/**
 * Build a fresh size×size grid of cell objects.
 * @param {number} size  4, 6, or 9
 */
function makeGrid(size) {
  var grid = [];
  for (var r = 0; r < size; r++) {
    grid[r] = [];
    for (var c = 0; c < size; c++) {
      grid[r][c] = {
        value:    0,
        given:    false,
        locked:   false,
        placedAt: null,
        fadeAt:   null,
        conflict: false
      };
    }
  }
  return grid;
}

/**
 * Return box dimensions for a given size.
 * size 4 → {boxRows:2, boxCols:2}
 * size 6 → {boxRows:2, boxCols:3}
 * size 9 → {boxRows:3, boxCols:3}
 */
function boxDims(size) {
  if (size === 4)  return { boxRows: 2, boxCols: 2 };
  if (size === 6)  return { boxRows: 2, boxCols: 3 };
  if (size === 9)  return { boxRows: 3, boxCols: 3 };
  throw new Error('Unsupported grid size: ' + size);
}

/**
 * Build region lists: rows, cols, boxes.
 * Each region is an array of {r, c} pairs.
 * Returns { rows, cols, boxes } — each an array of `size` regions.
 */
function buildRegions(size, boxRows, boxCols) {
  var rows  = [];
  var cols  = [];
  var boxes = [];
  var i, r, c;

  for (i = 0; i < size; i++) {
    rows[i] = [];
    cols[i] = [];
    boxes[i] = [];
  }

  var boxesAcross = size / boxCols; // number of box-columns

  for (r = 0; r < size; r++) {
    for (c = 0; c < size; c++) {
      rows[r].push({ r: r, c: c });
      cols[c].push({ r: r, c: c });
      var bIdx = Math.floor(r / boxRows) * boxesAcross + Math.floor(c / boxCols);
      boxes[bIdx].push({ r: r, c: c });
    }
  }

  return { rows: rows, cols: cols, boxes: boxes };
}

/**
 * Return true if every cell in the region has a non-zero value.
 */
function isRegionComplete(region, grid) {
  for (var i = 0; i < region.length; i++) {
    if (grid[region[i].r][region[i].c].value === 0) return false;
  }
  return true;
}

/**
 * Return true if every digit 1..size appears exactly once in the region.
 * Assumes isRegionComplete is true (no zeroes).
 */
function isRegionValid(region, grid, size) {
  var seen = {};
  for (var i = 0; i < region.length; i++) {
    var v = grid[region[i].r][region[i].c].value;
    if (v < 1 || v > size) return false;
    if (seen[v]) return false;
    seen[v] = true;
  }
  return true;
}

/**
 * Recompute conflict flags across the entire grid.
 * A cell is in conflict if another cell in the same row, col, or box
 * has the same non-zero value.
 * Modifies grid in-place; returns array of {r,c} cells whose conflict
 * flag changed (for event emission).
 */
function recomputeConflicts(grid, size, regions) {
  var changed = [];
  var r, c;

  // Reset all conflict flags first
  for (r = 0; r < size; r++) {
    for (c = 0; c < size; c++) {
      grid[r][c].conflict = false;
    }
  }

  // For each region, find duplicate values
  var allRegions = regions.rows.concat(regions.cols, regions.boxes);
  for (var ri = 0; ri < allRegions.length; ri++) {
    var region = allRegions[ri];
    var valueCells = {}; // value → [{r,c}]
    for (var i = 0; i < region.length; i++) {
      var cell = region[i];
      var v = grid[cell.r][cell.c].value;
      if (v === 0) continue;
      if (!valueCells[v]) valueCells[v] = [];
      valueCells[v].push(cell);
    }
    for (var v in valueCells) {
      if (valueCells[v].length > 1) {
        for (var j = 0; j < valueCells[v].length; j++) {
          grid[valueCells[v][j].r][valueCells[v][j].c].conflict = true;
        }
      }
    }
  }

  // Collect changed cells
  for (r = 0; r < size; r++) {
    for (c = 0; c < size; c++) {
      changed.push({ r: r, c: c });
    }
  }
  return changed;
}

/**
 * Deep-clone a grid (for undo history).
 */
function cloneGrid(grid, size) {
  var clone = [];
  for (var r = 0; r < size; r++) {
    clone[r] = [];
    for (var c = 0; c < size; c++) {
      var src = grid[r][c];
      clone[r][c] = {
        value:    src.value,
        given:    src.given,
        locked:   src.locked,
        placedAt: src.placedAt,
        fadeAt:   src.fadeAt,
        conflict: src.conflict
      };
    }
  }
  return clone;
}

if (typeof module !== 'undefined') module.exports = {
  makeGrid:           makeGrid,
  boxDims:            boxDims,
  buildRegions:       buildRegions,
  isRegionComplete:   isRegionComplete,
  isRegionValid:      isRegionValid,
  recomputeConflicts: recomputeConflicts,
  cloneGrid:          cloneGrid
};
