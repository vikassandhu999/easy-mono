import {Button, ScrollShadow, SearchField, Tabs} from '@heroui/react';
import {useDebouncedValue} from '@mantine/hooks';
import {IconBarbell, IconChefHat, IconPlus, IconRun, IconSalad} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import ExerciseList from '@/components/ExerciseList';
import PageWrapper, {PageSection} from '@/components/PageWrapper';
import TrainingPlanList from '@/components/TrainingPlanList';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {RecipeList} from '@/shared/RecipeList';

export const LIBRARY_CATEGORIES = [
  {
    id: 'training_plan',
    label: 'Training',
    value: 'training_plan',
    color: 'blue',
    icon: IconRun,
    searchPlaceholder: 'Search training plans...',
    emptyTitle: 'No training plans yet',
    emptyDescription: 'To Create your first training plan click on the + Create button',
    createLabel: 'Training Plan',
    createDrawerKey: DRAWER_KEYS.TRAINING_PLAN_CREATE,
    viewDrawerKey: DRAWER_KEYS.TRAINING_PLAN_BUILDER,
  },
  {
    id: 'plan',
    label: 'Nutrition',
    value: 'plan',
    color: 'cyan',
    icon: IconSalad,
    searchPlaceholder: 'Search nutrition plans...',
    emptyTitle: 'No nutrition plans yet',
    emptyDescription: 'To Create your first nutrition plan click on the + Create button',
    createLabel: 'Nutrition Plan',
    createDrawerKey: DRAWER_KEYS.NUTRITION_PLAN_CREATE,
    viewDrawerKey: DRAWER_KEYS.NUTRITION_PLAN_BUILDER,
  },
  {
    id: 'exercise',
    label: 'Exercises',
    value: 'exercise',
    color: 'green',
    icon: IconBarbell,
    searchPlaceholder: 'Search exercises...',
    emptyTitle: 'No exercises yet',
    emptyDescription: 'To Create your first exercise click on the + Create button',
    createLabel: 'Exercise',
    createDrawerKey: DRAWER_KEYS.EXERCISE_CREATE,
    viewDrawerKey: DRAWER_KEYS.EXERCISE_VIEW,
  },
  {
    id: 'recipe',
    label: 'Recipes',
    value: 'recipe',
    color: 'orange',
    icon: IconChefHat,
    searchPlaceholder: 'Search recipes...',
    emptyTitle: 'No recipes yet',
    emptyDescription: 'To Create your first recipe click on the + Create button',
    createLabel: 'Recipe',
    createDrawerKey: DRAWER_KEYS.RECIPE_CREATE,
    viewDrawerKey: DRAWER_KEYS.RECIPE_VIEW,
  },
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
export type LibraryCategoryValue = LibraryCategory['value'];

const CATEGORY_TABS = LIBRARY_CATEGORIES.map((cat) => ({
  label: cat.label,
  value: cat.value,
}));

const LibraryListPage = () => {
  const {openDrawer} = useParamsDrawer({});

  const [activeTab, setActiveTab] = useState<LibraryCategoryValue>('training_plan');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  const activeCategory = LIBRARY_CATEGORIES.find((cat) => cat.value === activeTab) ?? LIBRARY_CATEGORIES[0];

  const handleTabChange = (value: string) => {
    if (value) {
      setActiveTab(value as LibraryCategoryValue);
    }
  };

  const handleCreate = () => {
    openDrawer(activeCategory.createDrawerKey);
  };

  const handleRecipeView = (recipeId: string) => {
    openDrawer(DRAWER_KEYS.RECIPE_VIEW, {recipe_id: recipeId});
  };

  const handleNutritionPlanView = (nutritionPlanId: string) => {
    openDrawer(DRAWER_KEYS.NUTRITION_PLAN_BUILDER, {
      nutrition_plan_id: nutritionPlanId,
    });
  };

  const handleExerciseView = (exerciseId: string) => {
    openDrawer(DRAWER_KEYS.EXERCISE_VIEW, {exercise_id: exerciseId});
  };

  const handleTrainingPlanView = (trainingPlanId: string) => {
    openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
      training_plan_id: trainingPlanId,
    });
  };

  return (
    <PageWrapper>
      <PageSection className="w-full flex-1 sticky top-0 bg-background z-10 pt-4 md:pt-6 flex flex-col gap-2">
        <div className={'flex justify-between items-center'}>
          <ScrollShadow
            className="max-w-[90vw]"
            hideScrollBar
            orientation="horizontal"
            size={0}
          >
            <Tabs
              className={'w-full'}
              onSelectionChange={(selection) => handleTabChange(selection?.toString())}
              selectedKey={activeTab}
            >
              <Tabs.ListContainer>
                <Tabs.List
                  aria-label="Options"
                  className={'w-fit'}
                >
                  {CATEGORY_TABS.map((categoryTab) => (
                    <Tabs.Tab
                      className={'w-fit'}
                      id={categoryTab.value}
                      key={categoryTab.value}
                    >
                      {categoryTab.label}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </ScrollShadow>
          <Button
            className={'hidden sm:flex'}
            onClick={handleCreate}
            size={'md'}
          >
            <IconPlus size={24} />
            {activeCategory.createLabel}
          </Button>
        </div>

        <SearchField
          className={'mb-6'}
          name="search"
          onChange={(change) => setSearchInput(change)}
          value={searchInput}
        >
          <SearchField.Group className={'h-10'}>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </PageSection>

      <PageSection>
        {/* Content Lists */}
        {activeTab === 'recipe' && (
          <RecipeList
            onRecipeClick={handleRecipeView}
            search={search}
          />
        )}
        {activeTab === 'plan' && (
          <NutritionPlanList
            onPlanClick={handleNutritionPlanView}
            search={search}
          />
        )}
        {activeTab === 'exercise' && (
          <ExerciseList
            onExerciseClick={handleExerciseView}
            search={search}
          />
        )}
        {activeTab === 'training_plan' && (
          <TrainingPlanList
            onPlanClick={handleTrainingPlanView}
            search={search}
          />
        )}
      </PageSection>

      <Button
        aria-label={`Create ${activeCategory.createLabel}`}
        className={'sm:hidden'}
        onClick={handleCreate}
        size={'md'}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom) + 60px)',
          right: 'var(--mantine-spacing-md)',
          boxShadow: 'var(--ce-shadow-raised)',
          zIndex: 100,
        }}
      >
        <IconPlus size={24} />
        New
      </Button>
    </PageWrapper>
  );
};

export default LibraryListPage;
