import TrainingPlanCreateDrawer from '@/components/TrainingPlanCreateDrawer';
import {DRAWER_CONFIG, DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import AssignNutritionPlanDrawer from '@/shared/drawers/AssignNutritionPlanDrawer';
import AssignPlanDrawer from '@/shared/drawers/AssignPlanDrawer';
import AssignTrainingPlanDrawer from '@/shared/drawers/AssignTrainingPlanDrawer';
import BusinessEditDrawer from '@/shared/drawers/BusinessEditDrawer';
import ClientEditDrawer from '@/shared/drawers/ClientEditDrawer';
import ClientInviteDrawer from '@/shared/drawers/ClientInviteDrawer';
import ClientOverviewDrawer from '@/shared/drawers/ClientOverviewDrawer';
import ClientSettingsDrawer from '@/shared/drawers/ClientSettingsDrawer';
import CoachProfileEditDrawer from '@/shared/drawers/CoachProfileEditDrawer';
import CoachProfileViewDrawer from '@/shared/drawers/CoachProfileViewDrawer';
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
import TrainingPlanBuildDrawer from '@/shared/drawers/TrainingPlanBuildDrawer';
import TrainingPlanEditDrawer from '@/shared/drawers/TrainingPlanEditDrawer';
import TrainingPlanViewDrawer from '@/shared/drawers/TrainingPlanViewDrawer';

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
    case DRAWER_KEYS.ASSIGN_PLAN:
      return <AssignPlanDrawer />;
    case DRAWER_KEYS.ASSIGN_NUTRITION_PLAN:
      return <AssignNutritionPlanDrawer />;
    case DRAWER_KEYS.ASSIGN_TRAINING_PLAN:
      return <AssignTrainingPlanDrawer />;
    case DRAWER_KEYS.TRAINING_PLAN_VIEW:
      return <TrainingPlanViewDrawer />;
    case DRAWER_KEYS.TRAINING_PLAN_CREATE:
      return <TrainingPlanCreateDrawer />;
    case DRAWER_KEYS.TRAINING_PLAN_EDIT:
      return <TrainingPlanEditDrawer />;
    case DRAWER_KEYS.TRAINING_PLAN_BUILDER:
      return <TrainingPlanBuildDrawer />;
    case DRAWER_KEYS.CLIENT_EDIT:
      return <ClientEditDrawer />;
    case DRAWER_KEYS.CLIENT_INVITE:
      return <ClientInviteDrawer />;
    case DRAWER_KEYS.CLIENT_OVERVIEW:
      return <ClientOverviewDrawer />;
    case DRAWER_KEYS.CLIENT_SETTINGS:
      return <ClientSettingsDrawer />;
    case DRAWER_KEYS.BUSINESS_EDIT:
      return <BusinessEditDrawer />;
    case DRAWER_KEYS.COACH_PROFILE_VIEW:
      return <CoachProfileViewDrawer />;
    case DRAWER_KEYS.COACH_PROFILE_EDIT:
      return <CoachProfileEditDrawer />;

    default:
      return null;
  }
};

export default InAppDrawersPage;
