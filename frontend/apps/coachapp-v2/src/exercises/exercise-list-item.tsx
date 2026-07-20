import {Chip} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Dumbbell} from 'lucide-react';

import {BrowseRow, BrowseRowThumb, OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import type {TrainingExercise} from '@/api/generated';

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
    <BrowseRow
      icon={
        <BrowseRowThumb
          alt={exercise.name}
          fallback={<Dumbbell className="size-5 text-foreground" />}
          src={exercise.images[0]}
        />
      }
      id={exercise.id}
      meta={getSubtitle(exercise)}
      textValue={exercise.name}
      title={exercise.name}
      trailing={
        <>
          {mechanics && (
            <Chip
              className={OUTLINE_CHIP_CLASS}
              size="sm"
              variant="secondary"
            >
              {mechanics}
            </Chip>
          )}
          {force && (
            <Chip
              className={cn(OUTLINE_CHIP_CLASS, 'hidden sm:inline-flex')}
              size="sm"
              variant="secondary"
            >
              {force}
            </Chip>
          )}
        </>
      }
    />
  );
}
