import {FC, useEffect, useRef} from 'react';

import {useAuthActions} from '@/hooks/useAuthActions';
import {restoreAuth, tokenStorage} from '@/slices/authSlice';
import {useAppDispatch} from '@/store';

const AuthProvider: FC<React.PropsWithChildren> = ({children}) => {
  const dispatch = useAppDispatch();
  const {refreshAccessToken} = useAuthActions();

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) {
      return;
    }

    initRef.current = true;

    const initializeAuth = async () => {
      const currentPath = window.location.pathname;
      const publicPages = ['/login', '/register', '/verify', '/ob'];

      if (publicPages.some((page) => currentPath.startsWith(page))) {
        dispatch(restoreAuth());
        return;
      }

      const hasTokens = tokenStorage.hasTokens();

      if (!hasTokens) {
        dispatch(restoreAuth());
        return;
      }

      dispatch(restoreAuth());

      try {
        await refreshAccessToken(true);
      } catch (error) {
        console.error('Failed to refresh token on init:', error);
      }
    };

    initializeAuth();
  }, [dispatch, refreshAccessToken]);

  return <>{children}</>;
};

export default AuthProvider;

export {useAuth, useAuthActions as useAuthOperations} from '@/hooks/useAuthActions';
