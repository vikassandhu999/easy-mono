// Logger utility for environment-aware logging
export {logger} from './logger';
// Navigation utilities
export {
    ROUTE_PATTERNS_WITH_NAVIGATION as ROUTE_PATTERNS_WITH_HIDDEN_NAVIGATION,
    ROUTES_WITH_NAVIGATION as ROUTES_WITH_HIDDEN_NAVIGATION,
    shouldShowNavigation as shouldHideNavigation,
} from './navigation_config.ts';

// Other utilities
export {default as PrivateRoute} from './PrivateRoute';

export {useNavigationVisibility} from './useNavigationVisibility';
