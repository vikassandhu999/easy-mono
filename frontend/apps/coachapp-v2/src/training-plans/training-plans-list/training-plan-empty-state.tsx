import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

type Props = {
  hasFilter: boolean;
};

export default function TrainingPlanEmptyState({hasFilter}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {hasFilter ? (
        <>
          <Typography type="h5">No training plans found</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Try adjusting your search to find what you&apos;re looking for.
          </Typography>
        </>
      ) : (
        <>
          <Typography type="h5">No training plans yet</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Create your first training plan to get started.
          </Typography>
          <Button
            className="mt-3"
            onPress={() => navigate(ROUTES.CREATE_TRAINING_PLAN)}
            size="sm"
          >
            <Plus size={16} />
            Create Training Plan
          </Button>
        </>
      )}
    </div>
  );
}
