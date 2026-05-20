import {formatDateDisplay, isTodayDate, shiftDateByDays} from '@easy/utils';
import {Button} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useCallback, useRef} from 'react';

const SWIPE_THRESHOLD = 50;

export default function DateNavigator({date, onDateChange}: {date: Date; onDateChange: (date: Date) => void}) {
  const touchStartX = useRef<null | number>(null);

  const goBack = useCallback(() => {
    onDateChange(shiftDateByDays(date, -1));
  }, [date, onDateChange]);

  const goForward = useCallback(() => {
    onDateChange(shiftDateByDays(date, 1));
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
    if (touchStartX.current == null) {
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > SWIPE_THRESHOLD) {
      goBack();
    } else if (dx < -SWIPE_THRESHOLD) {
      goForward();
    }
  };

  const isToday = isTodayDate(date);

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
