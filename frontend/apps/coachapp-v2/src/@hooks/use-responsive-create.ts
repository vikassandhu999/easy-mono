import {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {useIsDesktop} from '@/@hooks/use-is-desktop';

export function useResponsiveCreate(createRoute: string) {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const startCreating = useCallback(() => {
    if (isDesktop) {
      navigate(createRoute);
      return;
    }
    setIsCreating(true);
  }, [createRoute, isDesktop, navigate]);

  const stopCreating = useCallback(() => setIsCreating(false), []);

  return {isCreating, startCreating, stopCreating};
}
