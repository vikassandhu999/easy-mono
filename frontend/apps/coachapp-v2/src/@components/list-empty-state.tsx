import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

type Props = {
  createLabel?: string;
  onCreate?: () => void;
  createRoute?: string;
  emptyDescription: string;
  filterDescription?: string;
  hasFilter: boolean;
  nounPlural: string;
};

export default function ListEmptyState({
  createLabel,
  onCreate,
  createRoute,
  emptyDescription,
  filterDescription = "Try adjusting your search to find what you're looking for.",
  hasFilter,
  nounPlural,
}: Props) {
  const navigate = useNavigate();
  const handleCreate = () => {
    if (onCreate) {
      onCreate();
      return;
    }
    if (createRoute) {
      navigate(createRoute);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {hasFilter ? (
        <>
          <Typography type="h5">No {nounPlural} found</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            {filterDescription}
          </Typography>
        </>
      ) : (
        <>
          <Typography type="h5">No {nounPlural} yet</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            {emptyDescription}
          </Typography>
          {(createRoute || onCreate) && createLabel && (
            <Button
              className="mt-3 min-h-11"
              onPress={handleCreate}
              size="sm"
            >
              <Plus size={16} />
              {createLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
