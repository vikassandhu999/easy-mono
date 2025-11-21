export const ROUTES_WITH_NAVIGATION = [
    '/',
    '/plans',
    '/programs', // Program list page
    '/clients', // clients list page
    '/content', // Content list page
    '/chats', // chats list page
    '/settings', // Settings list page
    '/library', // library list page
    '/profile',
];

export const ROUTE_PATTERNS_WITH_NAVIGATION = [];

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
