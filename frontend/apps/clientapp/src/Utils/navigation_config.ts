/**
 * Navigation configuration for the application.
 * This file centralizes the logic for determining which routes should hide navigation.
 */

export const ROUTES_WITH_NAVIGATION = [
  '/',
  '/plans',
  '/schedule',
  '/programs', // Program list page
  '/clients', // clients list page
  '/content', // Content list page
  '/chats', // chats list page
  '/settings', // Settings list page
  '/library', // library list page
  '/profile',
];

export const ROUTE_PATTERNS_WITH_NAVIGATION = [];

/**
 * Check if a given pathname should hide navigation.
 * This function provides a centralized place to define navigation visibility logic.
 */
export function shouldShowNavigation(pathname: string): boolean {
  // Check exact matches first
  if (ROUTES_WITH_NAVIGATION.includes(pathname)) {
    return true;
  }

  // Check pattern matches
  for (const pattern of ROUTE_PATTERNS_WITH_NAVIGATION) {
    if (pattern.test(pathname)) {
      return true;
    }
  }

  return false;
}
