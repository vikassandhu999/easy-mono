import {acquireScrollLock, calculateSheetGeometry, KEYBOARD_SHEET_TOP_GAP} from './keyboard-sheet-state.ts';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function geometry(layoutHeight: number, viewportHeight: number, offsetTop: number) {
  return calculateSheetGeometry({layoutHeight, offsetTop, topGap: KEYBOARD_SHEET_TOP_GAP, viewportHeight});
}

assertEqual(geometry(800, 800, 0).bottomInset, 0, 'desktop bottom inset');
assertEqual(geometry(800, 800, 0).maxHeight, 752, 'desktop max height');
assertEqual(geometry(800, 500, 0).bottomInset, 300, 'keyboard bottom inset');
assertEqual(geometry(800, 500, 0).maxHeight, 452, 'keyboard max height');
assertEqual(geometry(800, 500, 50).bottomInset, 250, 'panned viewport bottom inset');
assertEqual(geometry(800, 500, 50).maxHeight, 452, 'panned viewport max height');
assertEqual(geometry(800, 900, 0).maxHeight, 752, 'oversized viewport clamp');
assertEqual(geometry(800, 30, 0).maxHeight, 0, 'short viewport clamp');

function target(overflow: string) {
  return {style: {overflow}};
}

const sharedTarget = target('auto');
const releaseFirst = acquireScrollLock(sharedTarget);
const releaseSecond = acquireScrollLock(sharedTarget);
assertEqual(sharedTarget.style.overflow, 'hidden', 'nested lock applied');
releaseFirst();
assertEqual(sharedTarget.style.overflow, 'hidden', 'nested lock survives first release');
releaseSecond();
assertEqual(sharedTarget.style.overflow, 'auto', 'nested lock restores original overflow');
releaseSecond();
assertEqual(sharedTarget.style.overflow, 'auto', 'release is idempotent');

const firstTarget = target('scroll');
const secondTarget = target('visible');
const releaseTargetOne = acquireScrollLock(firstTarget);
const releaseTargetTwo = acquireScrollLock(secondTarget);
releaseTargetOne();
assertEqual(firstTarget.style.overflow, 'scroll', 'first target restored independently');
assertEqual(secondTarget.style.overflow, 'hidden', 'second target remains locked');
releaseTargetTwo();
assertEqual(secondTarget.style.overflow, 'visible', 'second target restored independently');

const alreadyLockedTarget = target('hidden');
acquireScrollLock(alreadyLockedTarget)();
assertEqual(alreadyLockedTarget.style.overflow, 'hidden', 'pre-locked target restored');

console.log('keyboard-sheet: all checks passed');
