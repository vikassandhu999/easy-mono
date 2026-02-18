import { Card } from "@heroui/react";
import { Dumbbell } from "lucide-react";

import type { Exercise } from "@/api/exercises";
import type { LibraryResourceExercise } from "@/pages/library/libraryData";

import { formatDate, toSentenceCase } from "@/pages/library/libraryShared";

type ExerciseCardProps = {
  onEdit?: (exercise: Exercise) => void;
  resource: LibraryResourceExercise;
};

export default function ExerciseCard({ onEdit, resource }: ExerciseCardProps) {
  const description = resource.data.description?.trim();

  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={() => onEdit?.(resource.data)}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
            <Dumbbell className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-foreground">
              {resource.data.name}
            </span>
            <span className="truncate text-sm text-muted">Exercises</span>
          </div>
        </div>

        {description ? (
          <p className="line-clamp-2 text-sm text-muted">{description}</p>
        ) : null}

        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            {resource.data.mechanics
              ? toSentenceCase(resource.data.mechanics)
              : "Not set"}{" "}
            mechanics
          </span>
          <span>
            {resource.data.force
              ? toSentenceCase(resource.data.force)
              : "Not set"}{" "}
            force
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>{resource.data.muscles.length} muscles</span>
          <span>{resource.data.equipment.length} equipment</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3 text-sm text-muted">
          <span>{formatDate(resource.data.updated_at)}</span>
          <span className="text-xs text-muted">Tap to edit</span>
        </div>
      </div>
    </Card>
  );
}
