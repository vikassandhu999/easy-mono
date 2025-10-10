import {Button, Drawer, Group, useDrawersStack} from '@mantine/core';

import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';

import {FixedBottomBar} from '../containers/FixedBottomBar.tsx';
import ExerciseCreateForm from '../ExerciseCreateForm';
import Header from '../layouts/Header.tsx';

type ExerciseCreateDrawerProps = {
    onExerciseCreated?: () => void;
    stack: ReturnType<typeof useDrawersStack<'create-exercise' | any>>;
};

export function ExerciseCreateDrawer({stack, onExerciseCreated}: ExerciseCreateDrawerProps) {
    return (
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
                    <ExerciseCreateForm
                        onCreated={() => {
                            onExerciseCreated?.();
                            stack.close('create-exercise');
                        }}
                    />
                </PaddingContainer>
                <FixedBottomBar>
                    <Group grow>
                        <Button
                            radius="lg"
                            variant="light"
                        >
                            Save as Draft
                        </Button>
                        <Button radius="lg">Save</Button>
                    </Group>
                </FixedBottomBar>
            </PagePaper>
        </Drawer>
    );
}
