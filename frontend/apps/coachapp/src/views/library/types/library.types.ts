/**
 * Library Module Types
 *
 * Type definitions for the library feature module.
 */

import {Content, ContentType} from '@/store/services/contents';

/**
 * Props for content click handlers
 */
export interface ContentClickHandler {
    (content: Content): void;
}

/**
 * Library page props
 */
export interface LibraryPageProps {
    /**
     * Initial content type to display
     * @default 'exercise'
     */
    initialContentType?: ContentType;
}

/**
 * Content list view props
 */
export interface ContentListViewProps {
    /**
     * Current content type being displayed
     */
    contentType: ContentType;

    /**
     * Callback when content item is clicked
     */
    onContentClick?: ContentClickHandler;

    /**
     * Callback when content type changes
     */
    onContentTypeChange: (type: ContentType) => void;

    /**
     * Callback when create button is clicked
     */
    onCreateClick: () => void;
}

/**
 * Content card base props
 */
export interface ContentCardProps {
    /**
     * Content item to display
     */
    content: Content;

    /**
     * Click handler
     */
    onClick?: () => void;
}

/**
 * Drawer state management
 */
export interface DrawerState {
    /**
     * Content being edited (null for create mode)
     */
    content: Content | null;

    /**
     * Whether drawer is open
     */
    isOpen: boolean;
}

/**
 * Library view state
 */
export interface LibraryViewState {
    /**
     * Currently selected content type
     */
    contentType: ContentType;

    /**
     * Create drawer state
     */
    createDrawer: DrawerState;

    /**
     * Edit drawer state
     */
    editDrawer: DrawerState;
}
