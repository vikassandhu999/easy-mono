import {Button, Chip, Surface, Typography} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useEffect} from 'react';

type Variant = {
  id: string;
  label: string;
};

export function PrototypeSwitcher({
  current,
  onChange,
  variants,
}: {
  current: string;
  onChange: (id: string) => void;
  variants: Variant[];
}) {
  const currentIndex = Math.max(
    0,
    variants.findIndex((variant) => variant.id === current),
  );

  const cycle = (offset: number) => {
    const nextIndex = (currentIndex + offset + variants.length) % variants.length;
    const next = variants[nextIndex];
    if (next) {
      onChange(next.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycle(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!import.meta.env.DEV) {
    return null;
  }

  const active = variants[currentIndex];

  return (
    <Surface className="fixed bottom-20 left-1/2 z-50 flex max-w-full -translate-x-1/2 items-center gap-2 rounded-panel border border-border bg-ink p-2 text-ink-foreground shadow-lg sm:bottom-4">
      <Chip
        color="accent"
        size="sm"
        variant="soft"
      >
        Prototype
      </Chip>
      <Button
        aria-label="Previous prototype variant"
        className="shrink-0 text-ink-foreground"
        isIconOnly
        onPress={() => cycle(-1)}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft />
      </Button>
      <Typography
        className="min-w-0 truncate text-ink-foreground"
        type="body-xs"
        weight="semibold"
      >
        {active ? `${active.id} — ${active.label}` : current}
      </Typography>
      <Button
        aria-label="Next prototype variant"
        className="shrink-0 text-ink-foreground"
        isIconOnly
        onPress={() => cycle(1)}
        size="sm"
        variant="ghost"
      >
        <ChevronRight />
      </Button>
    </Surface>
  );
}
