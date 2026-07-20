import {Button, Typography} from '@heroui/react';

// The one page-level fetch/load/empty error treatment. Replaces the hand-rolled
// danger boxes and ad-hoc text-danger Typography scattered across edit pages.
// Pass `onRetry` for fetch failures — it owns the Retry affordance so call sites
// don't each pair the card with their own button (and drift on whether to).

export function ErrorState({message, onRetry}: {message: string; onRetry?: () => void}) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
      <Typography
        className="text-danger"
        type="body-sm"
      >
        {message}
      </Typography>
      {onRetry ? (
        <Button
          className="mt-3"
          onPress={onRetry}
          size="sm"
          variant="secondary"
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}
