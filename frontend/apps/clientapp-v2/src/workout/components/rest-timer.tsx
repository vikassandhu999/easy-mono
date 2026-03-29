import {Button} from '@heroui/react';
import {Timer} from 'lucide-react';
import {useEffect, useState} from 'react';

// ── Component ────────────────────────────────────────────────

export default function RestTimer({onDone, restSeconds}: {onDone: () => void; restSeconds: number}) {
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
  const pad = (n: number) => n.toString().padStart(2, '0');
  const progress = 1 - remaining / restSeconds;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-content2 px-4 py-3">
      <Timer
        className="shrink-0 text-foreground-400"
        size={18}
      />
      <div className="flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums">
            {mins}:{pad(secs)}
          </span>
          <span className="text-xs text-foreground-400">rest</span>
        </div>
        {/* Progress bar */}
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-foreground-200">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{width: `${progress * 100}%`}}
          />
        </div>
      </div>
      <Button
        onPress={onDone}
        size="sm"
        variant="ghost"
      >
        Skip
      </Button>
    </div>
  );
}
