# API Reference — adenosine-puzzle

Sliding tile puzzle framework with grid engine, input, rendering, scoring, and UI.

## Table of Contents

- [createGame](#creategame) — Puzzle game instance
- [createUI](#createui) — Modals, dropdowns, formatting helpers
- [createScoring](#createscoring) — localStorage score table
- [createRenderer](#createrenderer) — DOM tile rendering
- [createInput](#createinput) — Arrow keys and touch swipe
- [PuzzleGrid](#puzzlegrid) — Grid math utilities
- [Types](#types)

---

## createGame

### `createGame(config)`

Create a puzzle game instance.

| Param | Type | Description |
|-------|------|-------------|
| `config` | `PuzzleGameConfig` | Game configuration |

Returns `PuzzleGame`.

```js
const game = AdPuzzle.createGame({ size: 4, gameName: 'fifteen-puzzle' });
game.init();
```

### PuzzleGame methods

| Method | Description |
|--------|-------------|
| `.init()` | Build the grid and seed it. Call before anything else — `.grid` is `null` until it runs. |
| `.handleMove(direction)` | Play a move (`'up'`, `'down'`, `'left'`, `'right'`). Returns `true` if the board changed. |
| `.moveInDirection(direction)` | The slide itself, without the move bookkeeping. Override to implement your puzzle's rules. |
| `.moveLeft()` | The leftward slide, called by the default `.moveInDirection()` after rotating the board. Override this one to write the rules once instead of four times. |
| `.addRandomTile()` | Place one tile. Supply your own — the default does nothing. |
| `.addInitialTiles()` | Called by `.init()`; calls `.addRandomTile()` twice. |
| `.isActive()` | `false` once won or lost |
| `.checkGameState()` / `.checkWin()` | Re-evaluate win/lose state |
| `.getGrid()` / `.setGrid(grid)` | Read or replace the grid |
| `.getElapsedTime()` | Milliseconds since `.init()` |
| `.render()` | Invoke the `onRender` callback |
| `.notifyStateChange()` | Invoke the `onStateChange` callback |
| `.setOnRender(fn)` | Called after every render |
| `.setOnStateChange(fn)` | Called with `{ score, moves, … }` when state changes |
| `.setOnGameOver(fn)` / `.setOnWin(fn)` | Terminal-state callbacks |

Readable properties: `grid`, `score`, `moves`, `size`, `gameName`, `difficulty`,
`spawnTiles`, `gameOver`, `won`, `startTime`, `endTime`, `lastDirection`.

**`spawnTiles` gates spawning after each *move*, not at the start.** `.init()`
always calls `.addInitialTiles()`, which calls your `.addRandomTile()` twice, so
a board begins with two tiles even when `spawnTiles: false`.

---

## createUI

### `createUI()`

Common UI helpers — modals, custom dropdowns, DOM shortcuts, and formatting.
Takes no arguments and holds no reference to a game; it is a grab bag of the
patterns every puzzle page needed, not a binding layer.

Returns `PuzzleUI`.

```js
const ui = AdPuzzle.createUI();
ui.registerModal('help', document.getElementById('help-modal'));
ui.showModal('help');
```

### PuzzleUI methods

| Method | Description |
|--------|-------------|
| `.registerModal(id, element)` | Register an element under an id |
| `.showModal(id)` / `.hideModal(id)` | Toggle the `active` class |
| `.hideAllModals()` | Close every registered modal |
| `.isModalOpen(id)` | Whether the modal carries `active` |
| `.setupModalClose(modalId, closeButtons)` | Wire close buttons plus backdrop click |
| `.setupDropdown(container, selected, options, onSelect?)` | Custom `<div>` dropdown |
| `.$(selector)` / `.$$(selector)` | `querySelector` / `querySelectorAll` |
| `.show(el)` / `.hide(el)` | Set `display` to `''` or `'none'`; null-safe |
| `.setText(el, text)` / `.setHTML(el, html)` | Null-safe writes |
| `.formatTime(seconds)` | `m:ss` |
| `.formatScore(score)` | Thousands separators |

---

## createScoring

### `createScoring(gameName, config?)`

Score table persisted to `localStorage` under `<gameName>_scores`. **This is
standalone — it does not talk to `adenosine-score-client` or any server.**

| Param | Type | Description |
|-------|------|-------------|
| `gameName` | `string` | Storage key prefix |
| `config` | `PuzzleScoringConfig` | `{ ascending }` — `true` ranks low scores first, for move- or time-based puzzles. Default `false`. |

Returns `PuzzleScoring`.

```js
const scoring = AdPuzzle.createScoring('fifteen-puzzle', { ascending: true });
scoring.addScore(game.score, 'normal', { moves: game.moves, time: game.getElapsedTime() });
```

### PuzzleScoring methods

| Method | Description |
|--------|-------------|
| `.addScore(score, difficulty, metadata?)` | Record a finished game; `metadata` may carry `moves`, `time`, `highestTile`. Returns the new rank. |
| `.getTopScores(difficulty?, limit?)` | Leaderboard, best first |
| `.getRank(score, difficulty?)` | Where a score would place |
| `.isNewHighScore(score, difficulty?)` | Whether it makes the table |
| `.getDifficulties()` | Difficulty keys that have scores |
| `.clearScores()` | Wipe every stored score — takes no arguments |

Move counts and elapsed time come from the game, not the scorer —
`game.moves` and `game.getElapsedTime()`.

---

## createRenderer

### `createRenderer(boardElement, config?)`

Tile rendering into a DOM container. **This is not a canvas renderer** — it
builds `<div>` elements and appends them to `boardElement`.

| Param | Type | Description |
|-------|------|-------------|
| `boardElement` | `HTMLElement` | Container the tiles are rendered into |
| `config` | `PuzzleRenderConfig` | `{ tileClass, emptyClass }`; default `'tile'` and `'tile-empty'` |

Returns `PuzzleRender`.

```js
const renderer = AdPuzzle.createRenderer(document.getElementById('board'));
renderer.renderGrid(game.getGrid());
```

### PuzzleRender methods

| Method | Description |
|--------|-------------|
| `.renderGrid(grid, tileRenderer?)` | Rebuild every tile; supply `tileRenderer` for custom elements |
| `.renderGridWithSpecial(grid, getTileContent)` | Rebuild using `TileInfo` — text, classes, attributes |
| `.createDefaultTile(row, col, value)` | The default `<div>` tile |
| `.updateTile(row, col, value, extraClasses?)` | Update one tile in place |
| `.getTile(row, col)` / `.getAllTiles()` | Query rendered tiles |
| `.clear()` | Empty the container |

---

## createInput

### `createInput(callbacks, boardElement?, options?)`

Arrow keys plus touch swipe. **Callbacks come first; the game is not passed in** —
the input layer only asks whether play is live and reports a direction.

| Param | Type | Description |
|-------|------|-------------|
| `callbacks` | `PuzzleInputCallbacks` | `{ onMove(direction), isActive() }` required; `onDrag` / `onDragEnd` optional |
| `boardElement` | `HTMLElement` | Optional element to bind touch events to |
| `options` | `PuzzleInputOptions` | Optional `{ swipeThreshold, commitOnThreshold }` |

Swipes shorter than 30px are ignored. Returns `PuzzleInput` — call `.destroy()`
to remove every listener.

```js
const input = AdPuzzle.createInput({
  onMove: (dir) => game.handleMove(dir),
  isActive: () => game.isActive(),
}, document.getElementById('board'));
```

#### Following the finger

By default a touch resolves only when it lifts, and nothing is reported while
it is down. Two opt-in additions change that:

- **`onDrag`** is called on every `touchmove`, with the displacement so
  far and the direction it would commit to. A game can use it to offset its
  tiles so they track the finger. `onDragEnd` follows when the finger lifts.
- **`commitOnThreshold`** fires `onMove` the moment the swipe threshold is
  crossed, rather than waiting for the lift.

```js
const input = AdPuzzle.createInput({
  onMove: (dir) => game.handleMove(dir),
  isActive: () => game.isActive(),
  onDrag: ({ dx, dy, direction }) => board.lean(dx, dy, direction),
  onDragEnd: () => board.settle(),
}, boardEl, { commitOnThreshold: true });
```

**Both are off unless asked for, and that is load-bearing.** The `touchmove`
listener is not registered at all unless one of them is supplied, so a page
that passes neither gets exactly the listeners it always had. Every puzzle in
the arcade loads this bundle; committing mid-drag is a different game to play,
and it is not this module's call to make on their behalf.

The listener is non-passive when registered, and calls `preventDefault` only
once a drag has passed the threshold — so a tap still behaves like a tap, and
the page is not pinned by every stray touch.

## PuzzleGrid

Namespace with grid math utilities.

| Function | Description |
|----------|-------------|
| `PuzzleGrid.create(size)` | Create an empty grid |
| `PuzzleGrid.isSolved(grid)` | Check if tiles are in order |
| `PuzzleGrid.getEmptyCells(grid)` | Every empty cell, as `{ row, col }[]` |
| `PuzzleGrid.findCell(grid, value)` | Locate a value, or `null` |
| `PuzzleGrid.swap(grid, a, b)` | Exchange two cells |
| `PuzzleGrid.rotate(grid)` | Rotate the board |
| `PuzzleGrid.isFull(grid)` / `.isSolved(grid)` | Terminal-state tests |
| `PuzzleGrid.hasAdjacentMatches(grid)` | Whether any merge is still possible |
| `PuzzleGrid.getValues(grid)` / `.getMaxValue(grid)` / `.countValue(grid, v)` | Value queries |
| `PuzzleGrid.clone(grid)` / `.equals(a, b)` / `.gridToString(grid)` | Copy, compare, debug |

Moves live on the game (`game.handleMove(dir)`), not on the grid — `PuzzleGrid`
is pure board math.

---

## Types

### `PuzzleGameConfig`

```ts
interface PuzzleGameConfig {
  size?: number;         // grid dimension, default 4
  gameName?: string;     // used as the scoring key
  difficulty?: string;
  spawnTiles?: boolean;  // spawn after each move, default true
}
```

### `Direction`

```ts
type Direction = 'up' | 'down' | 'left' | 'right';
```

### `PuzzleGame`

```ts
interface PuzzleGame {
  // Supply these — the defaults do nothing.
  addRandomTile(): void;
  moveLeft(): void;

  init(): void;
  handleMove(dir: Direction): boolean;
  moveInDirection(dir: Direction): void;
  addInitialTiles(): void;
  checkWin(): boolean;
  checkGameState(): void;
  isActive(): boolean;
  getElapsedTime(): number;
  getGrid(): PuzzleGridType;
  setGrid(g: PuzzleGridType): void;
  render(): void;
  notifyStateChange(): void;

  setOnRender(cb: (game: PuzzleGame) => void): void;
  setOnStateChange(cb: (info: StateChangeInfo) => void): void;
  setOnGameOver(cb: (game: PuzzleGame) => void): void;
  setOnWin(cb: (game: PuzzleGame) => void): void;

  grid: PuzzleGridType;
  score: number;
  moves: number;
  gameOver: boolean;
  won: boolean;
  endTime: number | null;
  readonly size: number;
  readonly difficulty: string;
  readonly gameName: string;
  readonly spawnTiles: boolean;
  readonly lastDirection: Direction | null;
  readonly startTime: number | null;
}
```

### `StateChangeInfo`

```ts
interface StateChangeInfo {
  score: number;
  moves: number;
  gameOver: boolean;
  won: boolean;
  elapsed: number;
  grid: PuzzleGridType;
}
```

### `PuzzleScoringConfig`

```ts
interface PuzzleScoringConfig {
  ascending?: boolean;   // rank low scores first, default false
}
```

### `ScoreEntry`

```ts
interface ScoreEntry {
  score: number;
  difficulty: string;
  date: string;
  moves: number;
  time: number;
  highestTile: number;
}
```

### `PuzzleRenderConfig`

```ts
interface PuzzleRenderConfig {
  tileClass?: string;    // default 'tile'
  emptyClass?: string;   // default 'tile-empty'
}
```

### `TileInfo`

```ts
interface TileInfo {
  text: string;
  classes?: string[];
  attributes?: Record<string, string>;
}
```

### `PuzzleInputCallbacks`

```ts
interface PuzzleInputCallbacks {
  onMove: (direction: Direction) => void;
  isActive: () => boolean;
  onDrag?: (state: PuzzleDragState) => void;
  onDragEnd?: () => void;
}
```

### `PuzzleInputOptions`

```ts
interface PuzzleInputOptions {
  swipeThreshold?: number;      // default 30
  commitOnThreshold?: boolean;  // default false
}
```

### `PuzzleDragState`

```ts
interface PuzzleDragState {
  dx: number;                    // movement from the touch origin, CSS pixels
  dy: number;
  direction: Direction | null;   // null until past the threshold
  committed: boolean;            // whether onMove has already fired
}
```
