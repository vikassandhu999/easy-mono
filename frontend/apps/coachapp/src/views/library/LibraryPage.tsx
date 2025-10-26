/**
 * Library Page Component
 *
 * Main library page that orchestrates content display, filtering, and CRUD operations.
 *
 * Architecture:
 * - Uses custom hooks for state management
 * - Delegates rendering to presentational components
 * - Handles drawer states and content operations
 * - Clean separation of concerns
 *
 * @module Library
 */

import {memo, useCallback} from 'react';

import PagePaper from '@/shared/containers/PagePaper';
import {ContentBuilderDrawer} from '@/shared/ContentBuilder';
import {Content} from '@/store/services/contents';

import {ContentListView} from './components';
import {CONTENT_TYPE_UI_CONFIG, VISIBLE_CONTENT_TYPES} from './constants';
import {useLibraryState} from './hooks';
import {LibraryPageProps} from './types';

/**
 * Main library page component
 *
 * Provides content library interface with:
 * - Content type filtering (exercises/recipes)
 * - Search and scope filtering
 * - Create/Edit operations via drawers
 * - Infinite scroll list view
 */
export const LibraryPage = memo<LibraryPageProps>(({initialContentType = VISIBLE_CONTENT_TYPES[0]}) => {
    const {
        closeCreateDrawer,
        closeEditDrawer,
        contentType,
        createDrawer,
        editDrawer,
        openCreateDrawer,
        openEditDrawer,
        setContentType,
    } = useLibraryState(initialContentType);

    const config = CONTENT_TYPE_UI_CONFIG[contentType];

    // Handle content item click - opens edit drawer
    const handleContentClick = useCallback(
        (content: Content) => {
            openEditDrawer(content);
        },
        [openEditDrawer],
    );

    // Handle successful create - close drawer and refresh list
    const handleCreateComplete = useCallback(() => {
        closeCreateDrawer();
        // List auto-refreshes via React Query
    }, [closeCreateDrawer]);

    // Handle successful edit - close drawer and refresh list
    const handleEditComplete = useCallback(() => {
        closeEditDrawer();
        // List auto-refreshes via React Query
    }, [closeEditDrawer]);

    return (
        <>
            {/* Create Drawer */}
            <ContentBuilderDrawer
                contentType={contentType}
                onClose={closeCreateDrawer}
                onComplete={handleCreateComplete}
                opened={createDrawer.isOpen}
                showSaveOptions={false}
                title={config.createTitle}
            />

            {/* Edit Drawer */}
            <ContentBuilderDrawer
                contentId={editDrawer.content?.id}
                contentType={contentType}
                onClose={closeEditDrawer}
                onComplete={handleEditComplete}
                opened={editDrawer.isOpen}
                showSaveOptions
                title={editDrawer.content?.name || ''}
            />

            {/* Main Page Content */}
            <PagePaper>
                <ContentListView
                    contentType={contentType}
                    onContentClick={handleContentClick}
                    onContentTypeChange={setContentType}
                    onCreateClick={openCreateDrawer}
                />
            </PagePaper>
        </>
    );
});

LibraryPage.displayName = 'LibraryPage';

// Export as default for route lazy loading
export default LibraryPage;
