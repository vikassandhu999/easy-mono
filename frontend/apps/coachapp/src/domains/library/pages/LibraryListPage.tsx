import {Button, Stack, useMantineTheme} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import Header from '@/shared/layouts/Header';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {RecipeList} from '@/shared/RecipeList';

import LibraryListViewSelector, {ContentState} from '../components/LibrayListViewSelector';
import {DRAWER_KEYS} from '../config';

const LibraryListPage = () => {
    const theme = useMantineTheme();
    const {openDrawer} = useParamsDrawer({});

    const [content, setContent] = useState<ContentState>({
        discipline: 'workout',
        type: 'workout',
        search: '',
    });

    const handleContentCreate = () => {
        openDrawer(DRAWER_KEYS.CONTENT_CREATE);
    };

    const handleRecipeView = (recipeId: string) => {
        openDrawer(DRAWER_KEYS.RECIPE_VIEW, {
            recipe_id: recipeId,
        });
    };

    const handleNutritionPlanView = (nutritionPlanId: string) => {
        openDrawer(DRAWER_KEYS.NUTRITION_PLAN_BUILDER, {
            nutrition_plan_id: nutritionPlanId,
        });
    };

    return (
        <PagePaper bottomGutter>
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

            <PaddingContainer
                style={{
                    paddingBottom: theme.spacing.xl,
                }}
            >
                <Stack>
                    <LibraryListViewSelector
                        content={content}
                        setContent={setContent}
                    />
                    {content.type === 'recipe' && (
                        <RecipeList
                            onRecipeClick={handleRecipeView}
                            search={content.search}
                        />
                    )}
                    {content.type === 'plan' && (
                        <NutritionPlanList
                            onPlanClick={handleNutritionPlanView}
                            search={content.search}
                        />
                    )}
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};

export default LibraryListPage;
