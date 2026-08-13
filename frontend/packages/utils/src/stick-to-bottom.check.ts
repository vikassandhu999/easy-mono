import {CAMERA_ACCEPT, IMAGE_CONTENT_TYPES, VIDEO_CONTENT_TYPES} from './media.ts';
import {isScrolledToBottom, STICK_TO_BOTTOM_THRESHOLD_PX} from './stick-to-bottom.ts';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

// --- stick-to-bottom -------------------------------------------------------
// Regression: opening a conversation must land on the ABSOLUTE bottom. The old
// sentinel + scrollIntoView left the scroller 11px short of the extent even
// after media had settled, and 31px short on a cold load.
const at = (scrollTop: number) => ({clientHeight: 645, scrollHeight: 1250, scrollTop});
const maxScrollTop = 1250 - 645; // 605

assertEqual(isScrolledToBottom(at(maxScrollTop)), true, 'exact bottom is pinned');
assertEqual(isScrolledToBottom(at(maxScrollTop - 11)), true, 'sentinel gap still counts as bottom');
assertEqual(isScrolledToBottom(at(maxScrollTop - STICK_TO_BOTTOM_THRESHOLD_PX)), true, 'threshold edge is pinned');
assertEqual(isScrolledToBottom(at(maxScrollTop - 31)), false, 'the reported 31px gap is NOT bottom');
assertEqual(isScrolledToBottom(at(0)), false, 'top of history is not pinned');

// Reading history must never be yanked to the bottom by a new message.
assertEqual(isScrolledToBottom(at(200)), false, 'scrolled-up viewer stays unpinned');

// Content shorter than the viewport can only ever be at the bottom.
assertEqual(isScrolledToBottom({clientHeight: 645, scrollHeight: 300, scrollTop: 0}), true, 'no overflow is bottom');

// A custom threshold is honoured (the hook may tighten it).
assertEqual(isScrolledToBottom(at(maxScrollTop - 11), 4), false, 'tight threshold rejects the sentinel gap');

// --- camera capture --------------------------------------------------------
// Regression: `capture` is only honoured when accept is a generic wildcard.
// Enumerating MIME types (image/jpeg,image/heic,…) makes Android and iOS fall
// back to the ordinary document picker — the "Camera opens the file browser" bug.
for (const part of CAMERA_ACCEPT.split(',')) {
  assertEqual(part.endsWith('/*'), true, `camera accept part "${part}" must be a wildcard`);
}
assertEqual(CAMERA_ACCEPT.includes('image/*'), true, 'camera accepts photos');
assertEqual(CAMERA_ACCEPT.includes('video/*'), true, 'camera accepts video');

// The library picker keeps the explicit list — the guard above must not be
// "fixed" by pointing the camera input at these.
for (const type of [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES]) {
  assertEqual(CAMERA_ACCEPT.includes(type), false, `camera accept must not enumerate ${type}`);
}

console.log('stick-to-bottom + camera-accept: all checks passed');
