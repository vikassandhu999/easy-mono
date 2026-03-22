import {Spinner} from '@heroui/react';
import {Navigate, Outlet} from 'react-router';

import {useGetMyBusinessQuery} from '@/services/business/business';

/**
 * Guard that checks if the current coach has completed onboarding
 * (i.e. has a business created). If not, redirects to /onboarding.
 *
 * Must be placed inside PrivateGaurd (user is already authenticated).
 */
const OnboardingGuard = () => {
  const {data: business, isLoading, isError} = useGetMyBusinessQuery();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // No business exists → onboarding not complete
  if (isError || !business) {
    return (
      <Navigate
        replace
        to="/onboarding"
      />
    );
  }

  return <Outlet />;
};

export default OnboardingGuard;
