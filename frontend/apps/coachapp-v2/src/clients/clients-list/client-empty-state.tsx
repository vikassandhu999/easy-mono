import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

type Props = {
  hasFilter: boolean;
};

export default function ClientEmptyState({hasFilter}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {hasFilter ? (
        <>
          <Typography type="h5">No clients found</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Try adjusting your search or filter to find what you&apos;re looking for.
          </Typography>
        </>
      ) : (
        <>
          <Typography type="h5">No clients yet</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            Invite your first client to get started.
          </Typography>
          <Button
            className="mt-3"
            onPress={() => navigate(ROUTES.INVITE_CLIENT)}
            size="sm"
          >
            <Plus size={16} />
            Invite Client
          </Button>
        </>
      )}
    </div>
  );
}
