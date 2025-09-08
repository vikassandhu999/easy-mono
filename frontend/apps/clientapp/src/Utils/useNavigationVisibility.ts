import { useLocation } from "react-router";
import { useMemo } from "react";
import { shouldShowNavigation } from "./navigation_config";

/**
 * Hook to determine if navigation should be hidden for the current route.
 * This can be useful for components that need to adjust their layout
 * based on whether navigation is visible.
 *
 * @returns boolean - true if navigation should be hidden, false otherwise
 *
 * @example
 * function MyComponent() {
 *   const isNavigationHidden = useNavigationVisibility();
 *
 *   return (
 *     <div style={{
 *       paddingLeft: isNavigationHidden ? 0 : 280  // Adjust layout based on navigation
 *     }}>
 *       Content here
 *     </div>
 *   );
 * }
 */
export function useNavigationVisibility(): boolean {
  const location = useLocation();

  return useMemo(() => {
    return shouldShowNavigation(location.pathname);
  }, [location.pathname]);
}
