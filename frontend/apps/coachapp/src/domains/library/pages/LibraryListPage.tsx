import {Button, Stack} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import React, {useState} from 'react';
import {Outlet} from 'react-router';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import {RecipeList} from '@/shared/RecipeList';

import LibraryListViewSelector, {ContentState} from '../components/LibrayListViewSelector';
import {DRAWER_KEYS} from '../config';
import {useLibraryDrawer} from '../hooks';

const LibraryListPage = () => {
    const {openDrawer} = useLibraryDrawer();

    const [content, setContent] = useState<ContentState>({
        discipline: 'workout',
        type: 'workout',
        search: '',
    });

    const handleContentCreate = () => {
        openDrawer(DRAWER_KEYS.CONTENT_CREATE);
    };

    const handleRecipeClick = (recipeId: string) => {
        openDrawer(DRAWER_KEYS.RECIPE_VIEW, {
            recipe_id: recipeId,
        });
    };

    return (
        <React.Fragment>
            <HeadingContainer>
                <Header
                    actions={
                        <Button
                            onClick={handleContentCreate}
                            radius="xl"
                            rightSection={<IconPlus size="18" />}
                            size="sm"
                        >
                            Create
                        </Button>
                    }
                    description="Here you can store and manage your reusable content like Exercises, Recipes, and Workouts"
                    title="Library"
                />
            </HeadingContainer>

            <PaddingContainer>
                <Stack>
                    <LibraryListViewSelector
                        content={content}
                        setContent={setContent}
                    />
                    {content.type === 'recipe' && (
                        <RecipeList
                            onRecipeClick={handleRecipeClick}
                            search={content.search}
                        />
                    )}
                </Stack>
            </PaddingContainer>
            {/* For drawer this will be render on based on params */}
            <Outlet />
        </React.Fragment>
    );
};

export default LibraryListPage;
