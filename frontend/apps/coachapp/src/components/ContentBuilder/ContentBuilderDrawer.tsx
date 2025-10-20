import {Container, Drawer, Stack} from '@mantine/core';
import React, {useCallback} from 'react';

import Header from '@/components/layouts/Header';
import {Content} from '@/store/services/contents';

import HeadingContainer from '../containers/HeaderContainer';
import ContentBuilder from './ContentBuilder';
import {ContentBuilderDrawerProps} from './lib/types';

/**
 * ContentBuilderDrawer - Drawer wrapper for ContentBuilder
 *
 * Architecture:
 * - Full-screen drawer with consistent structure
 * - Header with back navigation (constrained width 560px)
 * - Scrollable content area with gray background (constrained width)
 * - Proper Container sizing for mobile-first design
 *
 * Pattern: Follows constitutional drawer pattern (InviteClientDrawer, PlanCreateDrawer)
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
            // Always close on 'close' action or when in create mode
            if (action === 'close' || !contentId) {
                onComplete?.(content);
                onClose();
            } else if (action === 'continue') {
                // Just call onComplete but keep drawer open for continued editing
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
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: 0,
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
                <HeadingContainer style={{maxWidth: '560px', width: '100%'}}>
                    <Header
                        onBack={onClose}
                        title={title}
                    />
                </HeadingContainer>

                {/* Content Area - Constrained Width, Full Height for Fixed Bottom Bar */}
                <Container
                    bg="gray.0"
                    size={560}
                    style={{
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        overflow: 'hidden',
                        padding: 0,
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
