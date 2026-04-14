import {formatDateDisplay} from '@easy/utils';
import {Button} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useCallback, useRef} from 'react';

const SWIPE_THRESHOLD = 50;

export default function DateNavigator({date, onDateChange}: {date: Date; onDateChange: (date: Date) => void}) {
  const touchStartX = useRef<null | number>(null);

  const goBack = useCallback(() => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  }, [date, onDateChange]);

  const goForward = useCallback(() => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  }, [date, onDateChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track single-touch gestures
    if (e.touches.length !== 1) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > SWIPE_THRESHOLD) goBack();
    else if (dx < -SWIPE_THRESHOLD) goForward();
  };

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  return (
    <div
      className="flex items-center justify-between"
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
    >
      <Button
        onPress={goBack}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft size={18} />
      </Button>
      <div className="text-center">
        <p className="text-sm font-semibold">{formatDateDisplay(date)}</p>
        {isToday ? <p className="text-xs text-foreground-400">Today</p> : null}
      </div>
      <Button
        onPress={goForward}
        size="sm"
        variant="ghost"
      >
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}
