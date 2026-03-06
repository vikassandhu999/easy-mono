import {Toast} from '@heroui/react';
import {createRootRoute, Outlet} from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <span>Not Found</span>,
});

function RootLayout() {
  return (
    <>
      <Toast.Provider />
      <Outlet />
    </>
  );
}
