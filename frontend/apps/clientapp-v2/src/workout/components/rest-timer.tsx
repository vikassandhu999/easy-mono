import {Button} from '@heroui/react';
import {Timer} from 'lucide-react';
import {useEffect, useState} from 'react';

// ── Component ────────────────────────────────────────────────

export default function RestTimer({
  nextSetSummary,
  onDone,
  restSeconds,
}: {
  nextSetSummary?: null | string;
  onDone: () => void;
  restSeconds: number;
}) {
  const [remaining, setRemaining] = useState(restSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, onDone]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const totalMins = Math.floor(restSeconds / 60);
  const totalSecs = restSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const progress = 1 - remaining / restSeconds;

  return (
    <div className="rounded-xl border border-divider bg-content2 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Timer
          className="text-foreground-400"
          size={16}
        />
        <p className="text-sm font-semibold">Rest</p>
      </div>

      <p className="text-center text-xl font-semibold tabular-nums">
        {mins}:{pad(secs)}
        <span className="text-sm font-normal text-foreground-400">
          {' '}
          / {totalMins}:{pad(totalSecs)}
        </span>
      </p>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground-200">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
          style={{width: `${progress * 100}%`}}
        />
      </div>

      {nextSetSummary ? <p className="mt-3 text-sm text-foreground-500">Next: {nextSetSummary}</p> : null}

      <Button
        className="mt-3"
        onPress={onDone}
        size="sm"
        variant="ghost"
      >
        Skip rest
      </Button>
    </div>
  );
}
