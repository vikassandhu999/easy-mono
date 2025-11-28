import {DRAWER_CONFIG, DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import ContentCreateDrawer from '@/shared/drawers/ContentCreateDrawer';
import ExerciseCreateDrawer from '@/shared/drawers/ExerciseCreateDrawer';
import ExerciseEditDrawer from '@/shared/drawers/ExerciseEditDrawer';
import ExerciseViewDrawer from '@/shared/drawers/ExerciseViewDrawer';
import NutritionPlanBuildDrawer from '@/shared/drawers/NutritionPlanBuildDrawer';
import NutritionPlanCreateDrawer from '@/shared/drawers/NutritionPlanCreateDrawer';
import NutritionPlanEditDrawer from '@/shared/drawers/NutritionPlanEditDrawer';
import RecipeCreateDrawer from '@/shared/drawers/RecipeCreateDrawer';
import RecipeEditDrawer from '@/shared/drawers/RecipeEditDrawer';
import RecipeViewDrawer from '@/shared/drawers/RecipeViewDrawer';

const InAppDrawersPage = () => {
    const {activeDrawerKey} = useParamsDrawer({
        drawer_config: DRAWER_CONFIG,
    });

    switch (activeDrawerKey) {
        case DRAWER_KEYS.CONTENT_CREATE:
            return <ContentCreateDrawer />;
        case DRAWER_KEYS.RECIPE_CREATE:
            return <RecipeCreateDrawer />;
        case DRAWER_KEYS.RECIPE_VIEW:
            return <RecipeViewDrawer />;
        case DRAWER_KEYS.RECIPE_EDIT:
            return <RecipeEditDrawer />;
        case DRAWER_KEYS.NUTRITION_PLAN_CREATE:
            return <NutritionPlanCreateDrawer />;
        case DRAWER_KEYS.NUTRITION_PLAN_BUILDER:
            return <NutritionPlanBuildDrawer />;
        case DRAWER_KEYS.NUTRITION_PLAN_EDIT:
            return <NutritionPlanEditDrawer />;
        case DRAWER_KEYS.EXERCISE_CREATE:
            return <ExerciseCreateDrawer />;
        case DRAWER_KEYS.EXERCISE_VIEW:
            return <ExerciseViewDrawer />;
        case DRAWER_KEYS.EXERCISE_EDIT:
            return <ExerciseEditDrawer />;

        default:
            return null;
    }
};

export default InAppDrawersPage;
