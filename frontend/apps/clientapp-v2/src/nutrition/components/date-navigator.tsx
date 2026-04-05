import {Button} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';

import {formatDateDisplay} from '@/@utils/nutrition-helpers';

export default function DateNavigator({date, onDateChange}: {date: Date; onDateChange: (date: Date) => void}) {
  const goBack = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  };

  const goForward = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  const isToday =
    date.getFullYear() === new Date().getFullYear() &&
    date.getMonth() === new Date().getMonth() &&
    date.getDate() === new Date().getDate();

  return (
    <div className="flex items-center justify-between">
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
