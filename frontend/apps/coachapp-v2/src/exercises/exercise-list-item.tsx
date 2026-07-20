import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight, Dumbbell} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {TrainingExercise} from '@/api/generated';

const CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

const MECHANICS_MAP: Record<string, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  isometric: 'Isometric',
};

const FORCE_MAP: Record<string, string> = {
  pull: 'Pull',
  push: 'Push',
  static: 'Static',
};

function getSubtitle(exercise: TrainingExercise): string {
  const muscleNames = exercise.muscles.map((muscle) => muscle.name).join(', ');
  const kind = exercise.source === 'system' ? 'system' : 'custom';
  return muscleNames ? `${muscleNames} · ${kind}` : kind;
}

export default function ExerciseListItem({exercise}: {exercise: TrainingExercise}) {
  const mechanics = exercise.mechanics ? MECHANICS_MAP[exercise.mechanics] : null;
  const force = exercise.force ? FORCE_MAP[exercise.force] : null;

  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'gap-3 rounded-none border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
      )}
      id={exercise.id}
      textValue={exercise.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        {exercise.images[0] ? (
          <img
            alt={exercise.name}
            className="size-11 rounded-xl object-cover"
            src={exercise.images[0]}
          />
        ) : (
          <Dumbbell className="size-5 text-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{exercise.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">{getSubtitle(exercise)}</Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {mechanics && (
          <Chip
            className={CHIP_CLASS}
            size="sm"
            variant="secondary"
          >
            {mechanics}
          </Chip>
        )}
        {force && (
          <Chip
            className={cn(CHIP_CLASS, 'hidden sm:inline-flex')}
            size="sm"
            variant="secondary"
          >
            {force}
          </Chip>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
