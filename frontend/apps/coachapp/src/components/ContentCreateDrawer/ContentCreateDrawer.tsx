import {useDrawersStack} from '@mantine/core';
import {useQueryClient} from '@tanstack/react-query';

import {Content} from '@/api/contents.ts';
import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';
import {ContentBuilder} from '@/components/ContentBuilder';
import CEDrawer from '@/components/EasyDrawer/EasyDrawer';
import Header from '@/components/layouts/Header';

/**
 * ContentCreateDrawer - Drawer for creating new content
 *
 * Refactored to use ContentBuilder component following SessionBuilder pattern.
 * Maintains same API and behavior as before.
 */
export default function ContentCreateDrawer({
    contentType,
    onCreated,
    stack,
}: {
    contentType: Content['type'];
    onCreated: (content: Content) => void;
    stack: ReturnType<typeof useDrawersStack<'content-create'>>;
}) {
    const queryClient = useQueryClient();

    const handleComplete = async (content: Content) => {
        await queryClient.invalidateQueries({queryKey: ['contents']});
        onCreated(content);
        stack.close('content-create');
    };

    const onClose = () => {
        stack.close('content-create');
    };

    return (
        <CEDrawer
            {...stack.register('content-create')}
            header={
                <HeadingContainer>
                    <Header
                        onBack={onClose}
                        title="Create Content"
                    />
                </HeadingContainer>
            }
            onClose={onClose}
            overlayProps={{backgroundOpacity: 0.55, blur: 3}}
            position="right"
            size={'100%'}
            transitionProps={{duration: 200, transition: 'slide-left'}}
            withCloseButton={false}
        >
            <PagePaper>
                <ContentBuilder
                    contentType={contentType}
                    onComplete={handleComplete}
                />
            </PagePaper>
        </CEDrawer>
    );
}
