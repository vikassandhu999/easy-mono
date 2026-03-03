import {useEffect} from 'react';
import {Navigate, Outlet, useLocation} from 'react-router';

import {getAccessToken} from '@/entities/auth/api/auth';
import {AUTH_STORAGE_KEYS} from '@/entities/auth/model/authStorage';

export default function PrivateRoute() {
  const location = useLocation();
  const isAuthenticated = Boolean(getAccessToken());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEYS.accessToken && !event.newValue) {
        window.location.assign('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        state={{from: location.pathname}}
        to="/login"
      />
    );
  }

  return <Outlet />;
}
