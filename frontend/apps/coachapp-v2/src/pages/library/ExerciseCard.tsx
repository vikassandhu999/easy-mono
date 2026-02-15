import {Card} from '@heroui/react';
import {Dumbbell} from 'lucide-react';

import type {ExerciseResource} from '@/pages/library/libraryData';

import {formatDate} from '@/pages/library/libraryData';

type ExerciseCardProps = {
  resource: ExerciseResource;
};

export default function ExerciseCard({resource}: ExerciseCardProps) {
  return (
    <Card className="h-full border border-separator bg-surface p-4">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
            <Dumbbell className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-foreground">{resource.title}</span>
            <span className="truncate text-sm text-muted">Exercises</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>{resource.items} item</span>
          <span>Used {resource.usageCount} times</span>
        </div>

        <div className="mt-auto border-t border-separator pt-3 text-sm text-muted">
          Updated {formatDate(resource.updatedAt)}
        </div>
      </div>
    </Card>
  );
}
