import {Container, Drawer, Stack} from '@mantine/core';
import React, {useCallback} from 'react';

import Header from '@/components/layouts/Header';
import {Content, ContentType} from '@/store/services/contents';

import ContentBuilder from './ContentBuilder';

interface ContentBuilderDrawerProps {
    contentId?: string;
    contentType?: ContentType;
    onClose: () => void;
    onComplete?: (content: Content) => void;
    opened: boolean;
    showSaveOptions?: boolean;
    title: string;
}

/**
 * ContentBuilderDrawer - Drawer wrapper for ContentBuilder
 *
 * Follows the constitutional pattern of InviteClientDrawer and PlanCreateDrawer:
 * - Full-screen drawer with consistent structure
 * - Header with back navigation (constrained width)
 * - Scrollable content area with gray background (constrained width)
 * - Proper Container sizing (560px max-width)
 *
 * Usage:
 * - Create: <ContentBuilderDrawer contentType="exercise" title="Create exercise" ... />
 * - Edit: <ContentBuilderDrawer contentId="123" title="Edit exercise" ... />
 */
export const ContentBuilderDrawer = React.memo(function ContentBuilderDrawer({
    contentId,
    contentType,
    onClose,
    onComplete,
    opened,
    showSaveOptions = false,
    title,
}: ContentBuilderDrawerProps) {
    const handleComplete = useCallback(
        (content: Content, action?: 'close' | 'continue') => {
            // Always close on 'close' action or when no showSaveOptions (create mode)
            if (action === 'close' || !contentId) {
                onComplete?.(content);
                onClose();
            } else if (action === 'continue') {
                // Just call onComplete but keep drawer open for editing
                onComplete?.(content);
            }
        },
        [contentId, onClose, onComplete],
    );

    return (
        <Drawer
            onClose={onClose}
            opened={opened}
            position="right"
            size="100%"
            styles={{
                body: {
                    padding: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
            withCloseButton={false}
        >
            <Stack
                align="center"
                gap="md"
                h="100%"
            >
                {/* Header - Constrained Width */}
                <Container
                    p="md"
                    size={560}
                    w="100%"
                >
                    <Header
                        onBack={onClose}
                        title={title}
                    />
                </Container>

                {/* Content Area - Scrollable, Constrained Width */}
                <Container
                    bg="gray.0"
                    p="lg"
                    size={560}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                    }}
                    w="100%"
                >
                    <ContentBuilder
                        contentId={contentId}
                        contentType={contentType}
                        onComplete={handleComplete}
                        showSaveOptions={showSaveOptions}
                    />
                </Container>
            </Stack>
        </Drawer>
    );
});
