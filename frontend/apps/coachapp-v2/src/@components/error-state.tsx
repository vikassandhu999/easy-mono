import {Typography} from '@heroui/react';

// The one page-level fetch/load/empty error treatment. Replaces the hand-rolled
// danger boxes and ad-hoc text-danger Typography scattered across edit pages.

export function ErrorState({message}: {message: string}) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
      <Typography
        className="text-danger"
        type="body-sm"
      >
        {message}
      </Typography>
    </div>
  );
}
