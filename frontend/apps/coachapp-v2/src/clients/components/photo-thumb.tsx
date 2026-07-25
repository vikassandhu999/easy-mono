import {Button} from '@heroui/react';
import {ImageIcon} from 'lucide-react';

/**
 * `.photo` — a progress-photo tile. 25 across CD-OV, CD-CI, CD-CS and CD-PH.
 *
 *   .photo  border-radius:12px -> `--radius-panel` (13px)
 *           background:var(--surface-tertiary)
 *
 * Two shapes in the design and no others: a fixed 64px thumbnail in the row-level
 * strips, and `aspect-ratio:1` filling its grid cell on CD-PH.
 *
 * The placeholder is not a fallback for a slow network — a check-in genuinely may
 * have no photo for a pose, and the design draws an empty tile for it. So `src`
 * being absent is a normal state, not an error state.
 */
export function PhotoThumb({
  alt,
  fill = false,
  onPress,
  src,
  testId,
}: {
  alt: string;
  /** Fill the grid cell squarely (CD-PH) instead of the fixed 64px thumbnail. */
  fill?: boolean;
  onPress?: () => void;
  src?: null | string;
  testId?: string;
}) {
  const shape = `${fill ? 'aspect-square w-full' : 'size-16'} overflow-hidden rounded-panel bg-surface-tertiary`;
  const inner = src ? (
    <img
      alt={alt}
      className="size-full object-cover"
      loading="lazy"
      src={src}
    />
  ) : (
    <span className="flex size-full items-center justify-center text-muted-2">
      <ImageIcon aria-hidden />
    </span>
  );

  if (!onPress) {
    return (
      <div
        className={shape}
        data-testid={testId}
      >
        {inner}
      </div>
    );
  }
  return (
    <Button
      // `button--row` is the theme's release from the control tier: a tile is sized
      // by its content, and `--spacing-control` would force 36px onto a 64px square.
      aria-label={alt}
      className={`${shape} button--row`}
      data-testid={testId}
      onPress={onPress}
      variant="ghost"
    >
      {inner}
    </Button>
  );
}
