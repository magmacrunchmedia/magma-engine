/**
 * Keyboard and touch input handling for puzzle games.
 * Arrow key support, touch swipe detection, event cleanup.
 */

import type { Direction } from './puzzle-game.js';

/** Live state of a finger on the board, for games that draw the drag. */
export interface PuzzleDragState {
  /** Movement from the touch origin, in CSS pixels. */
  dx: number;
  dy: number;
  /** The direction this drag would commit to, or null below the threshold. */
  direction: Direction | null;
  /** Whether `onMove` has already fired for this touch. */
  committed: boolean;
}

export interface PuzzleInputCallbacks {
  onMove: (direction: Direction) => void;
  isActive: () => boolean;
  /**
   * Called on every touchmove while a finger is down, so a game can offset
   * its tiles and let them follow the finger. Optional: supplying it is what
   * makes the touchmove listener get registered at all.
   */
  onDrag?: (state: PuzzleDragState) => void;
  /** Called once when the finger lifts, to settle whatever `onDrag` moved. */
  onDragEnd?: () => void;
}

export interface PuzzleInput {
  destroy(): void;
}

export interface PuzzleInputOptions {
  /** Distance in pixels before a swipe counts. Default 30. */
  swipeThreshold?: number;
  /**
   * Fire `onMove` the moment the threshold is crossed, instead of waiting for
   * the finger to lift.
   *
   * Off by default, and deliberately: this bundle is loaded by every puzzle in
   * the arcade, and committing mid-drag is a different game to play. Opt in
   * per game rather than changing what two dozen pages already do.
   */
  commitOnThreshold?: boolean;
}

const SWIPE_THRESHOLD = 30;

export function create(
  callbacks: PuzzleInputCallbacks,
  boardElement?: HTMLElement,
  options: PuzzleInputOptions = {},
): PuzzleInput {
  const threshold = options.swipeThreshold ?? SWIPE_THRESHOLD;
  const wantsMove = !!callbacks.onDrag || !!options.commitOnThreshold;

  let touchStartX = 0;
  let touchStartY = 0;
  let committed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners: Array<{ element: any; event: string; handler: (e: any) => void }> = [];

  /** The direction a displacement implies, or null if it is still too small. */
  function directionOf(dx: number, dy: number): Direction | null {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) <= threshold) return null;
    if (absDx > absDy) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!callbacks.isActive()) return;

    let direction: Direction | null = null;
    switch (e.key) {
      case 'ArrowUp':    direction = 'up'; break;
      case 'ArrowDown':  direction = 'down'; break;
      case 'ArrowLeft':  direction = 'left'; break;
      case 'ArrowRight': direction = 'right'; break;
    }

    if (direction) {
      e.preventDefault();
      callbacks.onMove(direction);
    }
  }

  function onTouchStart(e: TouchEvent) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const touch = e.touches[0]!;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    committed = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (!callbacks.isActive()) return;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const touch = e.touches[0]!;
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const direction = directionOf(dx, dy);

    // Only once a drag is really under way, so a tap still behaves like a tap
    // and the page is not pinned by every stray touch.
    if (direction) e.preventDefault();

    if (options.commitOnThreshold && !committed && direction) {
      committed = true;
      callbacks.onMove(direction);
    }

    callbacks.onDrag?.({ dx, dy, direction, committed });
  }

  function onTouchEnd(e: TouchEvent) {
    if (!callbacks.isActive()) return;

    if (!committed) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const touch = e.changedTouches[0]!;
      const direction = directionOf(touch.clientX - touchStartX, touch.clientY - touchStartY);
      if (direction) callbacks.onMove(direction);
    }

    committed = false;
    callbacks.onDragEnd?.();
  }

  function setup() {
    document.addEventListener('keydown', onKeyDown);
    listeners.push({ element: document, event: 'keydown', handler: onKeyDown });

    if (boardElement) {
      boardElement.addEventListener('touchstart', onTouchStart, { passive: true });
      boardElement.addEventListener('touchend', onTouchEnd);
      listeners.push({ element: boardElement, event: 'touchstart', handler: onTouchStart });
      listeners.push({ element: boardElement, event: 'touchend', handler: onTouchEnd });

      // Registered only when someone asked for it. A page that passes neither
      // onDrag nor commitOnThreshold gets exactly the listeners it always had,
      // which is what keeps this change invisible to the rest of the arcade --
      // and non-passive, because preventDefault is the point of having it.
      if (wantsMove) {
        boardElement.addEventListener('touchmove', onTouchMove, { passive: false });
        listeners.push({ element: boardElement, event: 'touchmove', handler: onTouchMove });
      }
    }
  }

  function destroy() {
    for (const l of listeners) {
      l.element.removeEventListener(l.event, l.handler);
    }
    listeners.length = 0;
  }

  setup();

  return { destroy };
}
