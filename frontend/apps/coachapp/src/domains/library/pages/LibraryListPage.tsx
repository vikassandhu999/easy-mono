import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import PagePaper from '@/shared/containers/PagePaper';
import {ExerciseList} from '@/shared/ExerciseList';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {RecipeList} from '@/shared/RecipeList';
import {TrainingPlanList} from '@/shared/TrainingPlanList';

import LibraryListViewSelector, {ContentState} from '../components/LibrayListViewSelector';
import classes from './styles.module.css';

const LibraryListPage = () => {
    const {openDrawer} = useParamsDrawer({});

    const [content, setContent] = useState<ContentState>({
        discipline: 'training',
        type: 'training_plan',
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

    const handleExerciseView = (exerciseId: string) => {
        openDrawer(DRAWER_KEYS.EXERCISE_VIEW, {
            exercise_id: exerciseId,
        });
    };

    const handleTrainingPlanView = (trainingPlanId: string) => {
        openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
            training_plan_id: trainingPlanId,
        });
    };

    return (
        <PagePaper bottomGutter>
            <div className={classes.pageContainer}>
                {/* Header */}
                <div className={classes.headerSection}>
                    <div className={classes.headerRow}>
                        <div className={classes.headerContent}>
                            <h1 className={classes.pageTitle}>Library</h1>
                            <p className={classes.pageDescription}>
                                Store and manage your reusable content like Exercises, Recipes, and Training Plans
                            </p>
                        </div>
                        <button
                            className={classes.createButton}
                            onClick={handleContentCreate}
                            type="button"
                        >
                            <IconPlus size={16} />
                            Create
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={classes.contentSection}>
                    <div className={classes.contentList}>
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
                        {content.type === 'exercise' && (
                            <ExerciseList
                                onExerciseClick={handleExerciseView}
                                search={content.search}
                            />
                        )}
                        {content.type === 'training_plan' && (
                            <TrainingPlanList
                                onPlanClick={handleTrainingPlanView}
                                search={content.search}
                            />
                        )}
                    </div>
                </div>
            </div>
        </PagePaper>
    );
};

export default LibraryListPage;
