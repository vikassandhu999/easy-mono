import {Chip} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Exercise} from '@/api/exercises';

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

export default function ExerciseCard({exercise}: {exercise: Exercise}) {
  const mechanics = exercise.mechanics ? MECHANICS_MAP[exercise.mechanics] : null;
  const force = exercise.force ? FORCE_MAP[exercise.force] : null;
  const muscleNames = exercise.muscles.map((m) => m.name).join(', ');

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/library/exercises/${exercise.id}`}
    >
      {/* Icon placeholder (or first image thumbnail) */}
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

      {/* Name + muscles */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{exercise.name}</p>
        {muscleNames ? (
          <p className="truncate text-xs text-foreground-500">{muscleNames}</p>
        ) : (
          <p className="text-xs text-foreground-400">No muscles assigned</p>
        )}
      </div>

      {/* Metadata chips — hidden on small screens to save space */}
      <div className="hidden gap-1.5 sm:flex">
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
    </Link>
  );
}
