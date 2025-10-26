import { useOutlet, useLocation } from "react-router";
import { useMemo } from "react";
import { shouldShowNavigation } from "./navigation_config";
import ScrollToTop from "@/shared/ScrollToTop";
import { MainLayout } from "@/shared/layouts";

export default function ProtectedRouteLayout() {
  const Outlet = useOutlet();
  const location = useLocation();

  const showNavigation = useMemo(() => {
    return shouldShowNavigation(location.pathname);
  }, [location.pathname]);

  // const disableTopMargin = useMemo(() => {
  //     return location.pathname === '/';
  // }, [location.pathname]);

  console.log(location.pathname, showNavigation);

  return (
    <>
      <ScrollToTop />
      <MainLayout showNavigation={showNavigation}>{Outlet}</MainLayout>
    </>
  );
}
