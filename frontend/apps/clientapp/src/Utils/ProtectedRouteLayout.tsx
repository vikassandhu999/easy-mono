import { useOutlet, useLocation } from "react-router";
import { useMemo } from "react";
import { MainLayout } from "../Components/Layouts";
import { shouldShowNavigation } from "./navigationConfig";
import ScrollToTop from "../Components/ScrollToTop";

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
