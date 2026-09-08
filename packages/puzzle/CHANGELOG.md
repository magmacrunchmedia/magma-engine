# Changelog — `@magmacrunch/adenosine-puzzle`

This package only. Repo-wide changes — CI, guard scripts, build tooling — live
in the [monorepo changelog](../../CHANGELOG.md), which is also where the
narrative for every release before this file existed is written up.

The seven packages version independently, so a number here means nothing about
any other package.

## Unreleased

### Added — `createInput` can follow the finger

- `onDrag` reports displacement and the direction a touch would commit to, on
  every `touchmove`, so a game can offset its tiles and let them track the
  finger. `onDragEnd` follows when the finger lifts.
- `commitOnThreshold` fires `onMove` the moment the swipe threshold is crossed
  instead of waiting for the lift.
- `swipeThreshold` makes the 30px constant configurable.

Both drag features are off unless asked for, and the `touchmove` listener is
not registered at all unless one of them is supplied — so a page passing
neither gets exactly the listeners it always had. Every puzzle in the arcade
loads this bundle and committing mid-drag is a different game to play, so it
is opt-in per game rather than a change made on their behalf.

The listener is non-passive when registered and calls `preventDefault` only
once a drag passes the threshold, so a tap still behaves like a tap.

## 0.3.0 — 2026-08-29

### Changed — packaging

- `dist/index.global.js` is now a declared export (`./global`) with `unpkg` and
  `jsdelivr` fields, so the bundle the browser tools load off the CDN is named
  in the manifest instead of merely existing at a known path.
- `CHANGELOG.md` now ships in the tarball.
- Dead `.d.ts.map` files are gone. They pointed at a `src/` the tarball has
  never included, so an editor's go-to-definition followed them nowhere.

## Earlier releases

`0.2.5`, `0.2.4`, `0.2.3`, `0.2.2`, `0.2.1`, `0.2.0`

Descriptions for these are in the [monorepo changelog](../../CHANGELOG.md).
They are not restated here rather than restated approximately.
