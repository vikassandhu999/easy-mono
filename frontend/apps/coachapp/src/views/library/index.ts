/**
 * Library Module Exports
 *
 * Barrel export for the library feature module.
 */

// Components (optional - mainly for testing)
export {
    ContentListView,
    ContentTypeFilter,
    LibraryEmptyState,
    LibraryErrorState,
    LibraryHeader,
    LibrarySearch,
    ScopeFilterChips,
} from './components';

// Constants
export {CONTENT_TYPE_UI_CONFIG, DRAWER_PARAMS, NOTIFICATIONS, VISIBLE_CONTENT_TYPES} from './constants';

// Hooks
export {useLibraryState} from './hooks';

// Main component
export {default as LibraryPage, LibraryPage as LibraryPageComponent} from './LibraryPage';

// Types
export type {
    ContentCardProps,
    ContentClickHandler,
    ContentListViewProps,
    DrawerState,
    LibraryPageProps,
    LibraryViewState,
} from './types';
