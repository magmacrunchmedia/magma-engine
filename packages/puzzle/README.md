# @magmacrunch/adenosine-puzzle

Sliding tile puzzle framework — grid engine, input handling, rendering and
scoring. Powers 2048-likes, fifteen-puzzles and Klotski variants. No runtime
dependencies.

```bash
npm install @magmacrunch/adenosine-puzzle
```

## Use

The framework owns the grid, input and scoring; you supply the move rules,
because that is what differs between puzzles.

```js
import { PuzzleGrid, createGame, createInput, createRenderer, createScoring }
  from '@magmacrunch/adenosine-puzzle';

const board = document.getElementById('board');
const renderer = createRenderer(board);
const scoring = createScoring('fifteen-puzzle');

// spawnTiles gates spawning after each MOVE, not at the start: init() always
// calls addInitialTiles(), which calls your addRandomTile() twice.
const game = createGame({ size: 4, gameName: 'fifteen-puzzle', spawnTiles: false });

game.addRandomTile = () => {
  const empty = PuzzleGrid.getEmptyCells(game.grid);
  if (!empty.length) return;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  game.grid.board[cell.row][cell.col] = Math.random() < 0.9 ? 1 : 2;
};

game.moveLeft = () => { /* your sliding + merge rules */ };

game.setOnRender(() => renderer.renderGrid(game.grid));
game.setOnStateChange((info) => {
  document.getElementById('score').textContent = info.score;
});

createInput({ onMove: (dir) => game.handleMove(dir), isActive: () => game.isActive() }, board);
game.init();
```

## Without a bundler

Straight from a CDN — no npm, no build step:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-puzzle@0.4/puzzle-base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-puzzle@0.4/puzzle-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-puzzle@0.4/puzzle-modals.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-puzzle@0.4/puzzle-responsive.css">
<script src="https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-puzzle@0.4/dist/index.global.js"></script>
```

The IIFE build exposes `window.AdPuzzle`. The version is pinned to a minor here on purpose:
an unpinned URL follows `latest` and will cross a major without warning.

Installed from npm instead, the same file is `dist/index.global.js`.

## UI helpers

`createUI()` is separate from the game and takes no arguments — modals, custom
dropdowns, and the formatting every puzzle page needed:

```js
import { createUI } from '@magmacrunch/adenosine-puzzle';

const ui = createUI();
ui.registerModal('gameover', document.getElementById('gameover'));
ui.setupModalClose('gameover', [document.getElementById('close')]);
ui.setText(document.getElementById('time'), ui.formatTime(90)); // "1:30"
```

## Full API

[`API.md`](API.md) documents every export, with parameters and return shapes.

## Theming

| Property | Default | What it colours |
|---|---|---|
| `--apz-accent` | `#00f5ff` | Borders, headings, focus |
| `--apz-accent-bright` | `#33ffff` | Hover / emphasis |
| `--apz-accent-alt` | `#ff2d78` | Secondary accent, buttons |
| `--apz-accent-alt-hover` / `-dim` / `-dark` | `#ff5a99` / `#cc2266` / `#aa1155` | Its states |
| `--apz-bg` | `#0a0612` | Page |
| `--apz-bg-panel` | `#1a0a2a` | Board and modals |
| `--apz-border` | `#2a1a3a` | Dividers |
| `--apz-text` / `--apz-text-dim` | `#f0ead8` / `#8a7fa8` | Body / secondary |

Glows derive from the two accents via `color-mix`, so one override carries.

**Tile colours are deliberately not variables.** The value gradient is per-tile
and there are seventeen of them, so they stay literal — restyle them directly:

```css
.tile[data-value="2048"] { background: #ff00aa; color: #fff; }
```

Derived colours use `color-mix()`, which needs Chrome 111, Safari 16.2 or
Firefox 113 — all shipped in 2023.

## Module format

ESM only. The `exports` map declares no `require` condition, so this cannot be
`require()`d from CommonJS — use `import`, or the IIFE build above.

## License

[Apache-2.0](LICENSE) — Copyright 2026 Magma Crunch Media.

Part of [adenosine](https://github.com/magmacrunch-media/adenosine), a collection
of lightweight web game engines by [magmacrunch media](https://magmacrunch.com).
Keep the `NOTICE` file with any copy you distribute.
