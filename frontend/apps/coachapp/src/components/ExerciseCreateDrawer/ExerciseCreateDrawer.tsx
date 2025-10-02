import {Drawer, Text, useDrawersStack} from '@mantine/core';

import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';

import Header from '../layouts/Header.tsx';

type ExerciseCreateDrawerProps = {
    onExerciseCreated?: () => void;
    stack: ReturnType<typeof useDrawersStack<'create-exercise' | any>>;
};

export function ExerciseCreateDrawer({stack}: ExerciseCreateDrawerProps) {
    return (
        <>
            <Drawer
                {...stack.register('create-exercise')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('create-exercise')}
                            title="Create Exercise"
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <Text>Exercise creation form will be implemented here.</Text>
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
