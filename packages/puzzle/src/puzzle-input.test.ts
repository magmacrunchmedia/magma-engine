import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import * as PuzzleInput from './puzzle-input.js';
import type { Direction } from './puzzle-game.js';

/**
 * The module only ever calls addEventListener/removeEventListener, so a pair
 * of recording stubs is a truer test surface than jsdom would be: it lets the
 * assertions be about which listeners get registered, which is the actual
 * contract with the rest of the arcade.
 */
interface FakeTarget {
  handlers: Map<string, (e: unknown) => void>;
  options: Map<string, unknown>;
  addEventListener(type: string, fn: (e: unknown) => void, opts?: unknown): void;
  removeEventListener(type: string, fn: (e: unknown) => void): void;
  fire(type: string, event?: unknown): void;
  has(type: string): boolean;
}

function target(): FakeTarget {
  return {
    handlers: new Map(),
    options: new Map(),
    addEventListener(type, fn, opts) {
      this.handlers.set(type, fn);
      this.options.set(type, opts);
    },
    removeEventListener(type, fn) {
      if (this.handlers.get(type) === fn) this.handlers.delete(type);
    },
    fire(type, event = {}) {
      this.handlers.get(type)?.(event);
    },
    has(type) {
      return this.handlers.has(type);
    },
  };
}

/** A TouchEvent with just the fields the module reads. */
function touch(x: number, y: number, changed = false) {
  const list = [{ clientX: x, clientY: y }];
  return {
    touches: changed ? [] : list,
    changedTouches: changed ? list : [],
    preventDefault: vi.fn(),
  };
}

let doc: FakeTarget;

beforeEach(() => {
  doc = target();
  vi.stubGlobal('document', doc);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function harness(
  callbacks: Partial<PuzzleInput.PuzzleInputCallbacks> = {},
  options?: PuzzleInput.PuzzleInputOptions,
) {
  const moves: Direction[] = [];
  const board = target();
  const input = PuzzleInput.create(
    {
      onMove: (d) => moves.push(d),
      isActive: () => true,
      ...callbacks,
    },
    board as unknown as HTMLElement,
    options,
  );
  return { moves, board, input };
}

describe('PuzzleInput', () => {
  describe('by default (what every other arcade page gets)', () => {
    it('registers no touchmove listener', () => {
      const { board } = harness();
      expect(board.has('touchstart')).toBe(true);
      expect(board.has('touchend')).toBe(true);
      expect(board.has('touchmove')).toBe(false);
    });

    it('still resolves a swipe on touchend', () => {
      const { moves, board } = harness();
      board.fire('touchstart', touch(100, 100));
      board.fire('touchend', touch(160, 105, true));
      expect(moves).toEqual(['right']);
    });

    it('ignores movement below the threshold', () => {
      const { moves, board } = harness();
      board.fire('touchstart', touch(100, 100));
      board.fire('touchend', touch(120, 108, true));
      expect(moves).toEqual([]);
    });

    it('picks the dominant axis', () => {
      const { moves, board } = harness();
      board.fire('touchstart', touch(100, 100));
      board.fire('touchend', touch(110, 180, true));
      expect(moves).toEqual(['down']);
    });
  });

  describe('onDrag', () => {
    it('registers touchmove, non-passive, when supplied', () => {
      const { board } = harness({ onDrag: () => {} });
      expect(board.has('touchmove')).toBe(true);
      expect(board.options.get('touchmove')).toEqual({ passive: false });
    });

    it('reports displacement and a null direction below the threshold', () => {
      const seen: PuzzleInput.PuzzleDragState[] = [];
      const { board } = harness({ onDrag: (s) => seen.push(s) });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(112, 104));
      expect(seen).toEqual([{ dx: 12, dy: 4, direction: null, committed: false }]);
    });

    it('reports a direction once past the threshold, without moving on its own', () => {
      const seen: PuzzleInput.PuzzleDragState[] = [];
      const { board, moves } = harness({ onDrag: (s) => seen.push(s) });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(150, 100));
      expect(seen.at(-1)).toEqual({ dx: 50, dy: 0, direction: 'right', committed: false });
      expect(moves).toEqual([]);
    });

    it('does not preventDefault until the drag passes the threshold', () => {
      const { board } = harness({ onDrag: () => {} });
      board.fire('touchstart', touch(100, 100));
      const small = touch(105, 100);
      board.fire('touchmove', small);
      expect(small.preventDefault).not.toHaveBeenCalled();
      const big = touch(150, 100);
      board.fire('touchmove', big);
      expect(big.preventDefault).toHaveBeenCalled();
    });

    it('fires onDragEnd when the finger lifts', () => {
      const onDragEnd = vi.fn();
      const { board } = harness({ onDrag: () => {}, onDragEnd });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchend', touch(100, 100, true));
      expect(onDragEnd).toHaveBeenCalledOnce();
    });
  });

  describe('commitOnThreshold', () => {
    it('moves mid-drag and does not move again on lift', () => {
      const { moves, board } = harness({}, { commitOnThreshold: true });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(150, 100));
      expect(moves).toEqual(['right']);
      board.fire('touchend', touch(200, 100, true));
      expect(moves).toEqual(['right']);
    });

    it('commits once per touch, however far the finger keeps going', () => {
      const { moves, board } = harness({}, { commitOnThreshold: true });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(150, 100));
      board.fire('touchmove', touch(200, 100));
      board.fire('touchmove', touch(250, 100));
      expect(moves).toEqual(['right']);
    });

    it('resets between touches', () => {
      const { moves, board } = harness({}, { commitOnThreshold: true });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(150, 100));
      board.fire('touchend', touch(150, 100, true));
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(100, 150));
      expect(moves).toEqual(['right', 'down']);
    });
  });

  describe('swipeThreshold', () => {
    it('is configurable', () => {
      const { moves, board } = harness({}, { swipeThreshold: 5 });
      board.fire('touchstart', touch(100, 100));
      board.fire('touchend', touch(110, 100, true));
      expect(moves).toEqual(['right']);
    });
  });

  describe('isActive', () => {
    it('gates keyboard, touchmove and touchend alike', () => {
      const { moves, board } = harness(
        { isActive: () => false, onDrag: () => {} },
        { commitOnThreshold: true },
      );
      board.fire('touchstart', touch(100, 100));
      board.fire('touchmove', touch(150, 100));
      board.fire('touchend', touch(150, 100, true));
      doc.fire('keydown', { key: 'ArrowLeft', preventDefault: vi.fn() });
      expect(moves).toEqual([]);
    });
  });

  describe('keyboard', () => {
    it('maps the arrows', () => {
      const { moves } = harness();
      for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) {
        doc.fire('keydown', { key, preventDefault: vi.fn() });
      }
      expect(moves).toEqual(['up', 'down', 'left', 'right']);
    });
  });

  describe('destroy()', () => {
    it('removes every listener it added, touchmove included', () => {
      const { board, input } = harness({ onDrag: () => {} });
      expect(board.handlers.size).toBe(3);
      expect(doc.handlers.size).toBe(1);
      input.destroy();
      expect(board.handlers.size).toBe(0);
      expect(doc.handlers.size).toBe(0);
    });
  });
});
