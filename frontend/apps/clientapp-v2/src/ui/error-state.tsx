import {Button} from '@heroui/react';

/**
 * The one screen-level "we couldn't load this" state. Five screens each had
 * their own version of this block — two hand-rolling the retry button's accent
 * styling, two using different HeroUI variants, all with different padding.
 *
 * Copy rule (shared with coachapp): say "Couldn't load X", never "Failed to
 * load X". Pass the connection hint only where retrying is likely to help.
 */
export default function ErrorState({
  hint = 'Check your connection and try again.',
  message,
  onRetry,
}: {
  hint?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-foreground">{message}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      <Button
        className="mt-2"
        onPress={onRetry}
        size="sm"
        variant="secondary"
      >
        Retry
      </Button>
    </div>
  );
}
