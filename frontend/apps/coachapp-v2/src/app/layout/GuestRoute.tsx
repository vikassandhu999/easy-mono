import {Navigate, Outlet} from 'react-router';

import {getAccessToken} from '@/entities/auth/api/auth';
import {useGetMyBusinessQuery} from '@/entities/business/api/business';

export default function GuestRoute() {
  const isAuthenticated = Boolean(getAccessToken());
  const {data, isLoading} = useGetMyBusinessQuery(undefined, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground/70">
        Checking your workspace...
      </div>
    );
  }

  if (data?.data?.id) {
    return (
      <Navigate
        replace
        to="/clients"
      />
    );
  }

  return (
    <Navigate
      replace
      to="/onboarding"
    />
  );
}
