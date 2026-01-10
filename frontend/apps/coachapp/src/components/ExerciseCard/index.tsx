import {Avatar, Chip} from '@heroui/react';
import {BarbellIcon} from '@phosphor-icons/react';

import {Exercise, isSystemExercise} from '@/services/exercises';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: (id: string) => void;
}

const ExerciseCard = ({exercise, onClick}: ExerciseCardProps) => {
  const isSystem = isSystemExercise(exercise);
  const firstImage = exercise.images?.[0];

  return (
    <button
      aria-label={`Exercise: ${exercise.name}`}
      className={
        'w-full flex gap-2 p-3 shadow rounded-2xl border border-gray-200 cursor-pointer bg-surface hover:shadow-md hover:bg-surface-hover'
      }
      onClick={() => onClick?.(exercise.id)}
    >
      <div className={'flex flex-nowrap gap-4 items-center'}>
        <Avatar size={'lg'}>
          <Avatar.Image
            alt={exercise.name}
            src={firstImage}
          />
          <Avatar.Fallback>
            <BarbellIcon size={24} />
          </Avatar.Fallback>
        </Avatar>

        <div className={'gap-1 flex flex-col items-start flex-1'}>
          <div className={'flex gap-2 items-center'}>
            <h3 className={'text-sm text-start font-semibold'}>{exercise.name}</h3>
            {!isSystem && (
              <Chip
                color={'warning'}
                size={'sm'}
                variant={'tertiary'}
              >
                {'Custom'}
              </Chip>
            )}
          </div>

          {(exercise.mechanics || exercise.force) && (
            <div className={'flex gap-2 items-center'}>
              {exercise.mechanics && (
                <Chip
                  className={'capitalize'}
                  color={'accent'}
                  size={'md'}
                  variant={'secondary'}
                >
                  {exercise.mechanics}
                </Chip>
              )}
              {exercise.force && (
                <Chip
                  className={'capitalize'}
                  color={'success'}
                  size={'md'}
                  variant={'secondary'}
                >
                  {exercise.force}
                </Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default ExerciseCard;
