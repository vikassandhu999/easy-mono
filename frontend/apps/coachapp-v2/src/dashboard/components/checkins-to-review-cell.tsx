import {ClipboardCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {StatCell} from '@/dashboard/components/stat-cell';

export function CheckinsToReviewCell({count, isError}: {count: null | number; isError: boolean}) {
  const navigate = useNavigate();
  return (
    <StatCell
      errorLabel={isError ? "Couldn't load review queue" : undefined}
      icon={ClipboardCheck}
      label="Check-ins to review"
      meta="Open queue"
      onPress={() => navigate(ROUTES.CHECKINS_TO_REVIEW)}
      value={count}
    />
  );
}
