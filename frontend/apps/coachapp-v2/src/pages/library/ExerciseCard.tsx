import {Dumbbell} from 'lucide-react';

import type {Exercise} from '@/api/exercises';
import type {LibraryResourceExercise} from '@/pages/library/libraryData';

import {toSentenceCase} from '@/components/formatHelpers';
import LibraryCard from '@/pages/library/LibraryCard';

type ExerciseCardProps = {
  onEdit?: (exercise: Exercise) => void;
  resource: LibraryResourceExercise;
};

export default function ExerciseCard({onEdit, resource}: ExerciseCardProps) {
  const description = resource.data.description?.trim();

  return (
    <LibraryCard
      icon={<Dumbbell className="h-5 w-5 text-foreground" />}
      onPress={() => onEdit?.(resource.data)}
      subtitle="Exercises"
      title={resource.data.name}
    >
      {description ? <p className="line-clamp-2 text-sm text-muted">{description}</p> : null}

      <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted">
        <span>{resource.data.mechanics ? toSentenceCase(resource.data.mechanics) : 'Not set'} mechanics</span>
        <span>{resource.data.force ? toSentenceCase(resource.data.force) : 'Not set'} force</span>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-muted">
        <span>{resource.data.muscles.length} muscles</span>
        <span>{resource.data.equipment.length} equipment</span>
      </div>
    </LibraryCard>
  );
}
