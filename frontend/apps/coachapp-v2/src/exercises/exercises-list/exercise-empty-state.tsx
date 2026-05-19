import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

type Props = {
  hasFilter: boolean;
};

export default function ExerciseEmptyState({hasFilter}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {hasFilter ? (
        <>
          <Typography type="h5">No exercises found</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Try adjusting your search or filters to find what you&apos;re looking for.
          </Typography>
        </>
      ) : (
        <>
          <Typography type="h5">No exercises yet</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Create your first exercise to get started.
          </Typography>
          <Button
            className="mt-3"
            onPress={() => navigate(ROUTES.CREATE_EXERCISE)}
            size="sm"
          >
            <Plus size={16} />
            Create Exercise
          </Button>
        </>
      )}
    </div>
  );
}
