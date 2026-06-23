import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

type Props = {
  createLabel?: string;
  createRoute?: string;
  emptyDescription: string;
  filterDescription?: string;
  hasFilter: boolean;
  nounPlural: string;
};

export default function ListEmptyState({
  createLabel,
  createRoute,
  emptyDescription,
  filterDescription = "Try adjusting your search to find what you're looking for.",
  hasFilter,
  nounPlural,
}: Props) {
  const navigate = useNavigate();

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
          {createRoute && createLabel && (
            <Button
              className="mt-3"
              onPress={() => navigate(createRoute)}
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
