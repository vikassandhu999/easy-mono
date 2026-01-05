import {useCallback} from 'react';
import {useNavigate} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';

export function useNavigationState(onClose?: () => void) {
  const navigate = useNavigate();
  const {logout} = useAuth();

  const handleNavigation = useCallback(
    (href: string) => {
      navigate(href);
      onClose?.();
    },
    [navigate, onClose],
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  return {
    handleLogout,
    handleNavigation,
  };
}
