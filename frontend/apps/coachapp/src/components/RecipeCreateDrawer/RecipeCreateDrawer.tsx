import {Drawer, useDrawersStack} from '@mantine/core';

import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';

import Header from '../layouts/Header.tsx';
import RecipeCreateForm from '../RecipeCreateForm';

type RecipeCreateDrawerProps = {
    onRecipeCreated?: () => void;
    stack: ReturnType<typeof useDrawersStack<'create-recipe' | any>>;
};

export function RecipeCreateDrawer({stack}: RecipeCreateDrawerProps) {
    return (
        <>
            <Drawer
                {...stack.register('create-recipe')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('create-recipe')}
                            title="Create Recipe"
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <RecipeCreateForm
                            onSubmit={async (data) => {
                                console.log('Recipe data:', data);
                            }}
                            submitText={'Create Recipe'}
                        />
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
