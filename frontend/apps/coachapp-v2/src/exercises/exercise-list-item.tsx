import {Chip, Description, Label, ListBox} from '@heroui/react';
import {Dumbbell} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {TrainingTrainingExercise} from '@/api/generated';

const MECHANICS_MAP: Record<string, {color: 'accent' | 'default' | 'warning'; label: string}> = {
  compound: {color: 'accent', label: 'Compound'},
  isolation: {color: 'warning', label: 'Isolation'},
  isometric: {color: 'default', label: 'Isometric'},
};

const FORCE_MAP: Record<string, string> = {
  pull: 'Pull',
  push: 'Push',
  static: 'Static',
};

function getTrainingExerciseSubtitle(exercise: TrainingExercise): string {
  const muscleNames = exercise.muscles.map((muscle) => muscle.name).join(', ');
  const isSystem = exercise.source === 'system';

  if (muscleNames && isSystem) {
    return `${muscleNames} · system`;
  }
  if (muscleNames) {
    return muscleNames;
  }
  if (isSystem) {
    return 'system';
  }
  return 'No muscles assigned';
}

export default function TrainingExerciseListItem({exercise}: {exercise: TrainingExercise}) {
  const mechanics = exercise.mechanics ? MECHANICS_MAP[exercise.mechanics] : null;
  const force = exercise.force ? FORCE_MAP[exercise.force] : null;

  return (
    <ListBox.Item
      className={LIST_ITEM_CLASS}
      id={exercise.id}
      textValue={exercise.name}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        {exercise.images[0] ? (
          <img
            alt={exercise.name}
            className="size-10 rounded-lg object-cover"
            src={exercise.images[0]}
          />
        ) : (
          <Dumbbell
            className="text-foreground-400"
            size={20}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{exercise.name}</Label>
        <Description className="truncate">{getTrainingExerciseSubtitle(exercise)}</Description>
      </div>

      <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
        {mechanics && (
          <Chip
            color={mechanics.color}
            size="sm"
            variant="soft"
          >
            {mechanics.label}
          </Chip>
        )}
        {force && (
          <Chip
            size="sm"
            variant="soft"
          >
            {force}
          </Chip>
        )}
      </div>
    </ListBox.Item>
  );
}
