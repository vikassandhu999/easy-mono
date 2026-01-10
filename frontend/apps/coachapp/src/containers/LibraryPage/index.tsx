import {SearchField, Tabs} from '@heroui/react';
import {Button, Group, ScrollArea, SegmentedControl, Stack, TextInput} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconBarbell, IconChefHat, IconPlus, IconRun, IconSalad, IconX} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';

import PageWrapper from '@/components/PageWrapper';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {ExerciseList} from '@/shared/ExerciseList';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {RecipeList} from '@/shared/RecipeList';
import {TrainingPlanList} from '@/shared/TrainingPlanList';

export const LIBRARY_CATEGORIES = [
  {
    id: 'training_plan',
    label: 'Training Plans',
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
    label: 'Nutrition Plans',
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
  const segmentedControlRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

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
      // Scroll the selected segment into view within ScrollArea viewport
      const container = segmentedControlRef.current;
      const viewport = scrollViewportRef.current;
      if (container && viewport) {
        // Find the input with the matching value, then get its parent label
        const input = container.querySelector(`input[value="${value}"]`) as HTMLElement;
        const selectedLabel = input?.closest('label') as HTMLElement;
        if (selectedLabel) {
          container.scrollIntoView({block: 'nearest', inline: 'center'});
          selectedLabel.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
        }
      }
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
      <Group
        align="center"
        justify={'space-between'}
      >
        <ScrollArea type={'never'}>
          <Tabs
            className={'mb-4 w-full'}
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
        </ScrollArea>
        <Button
          color={'blue'}
          leftSection={<IconPlus size={20} />}
          onClick={handleCreate}
          size={'md'}
          style={{
            boxShadow: 'var(--ce-shadow-raised)',
          }}
          visibleFrom="sm"
        >
          {activeCategory.createLabel}
        </Button>
      </Group>

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
      <Button
        aria-label={`Create ${activeCategory.createLabel}`}
        color="var(--ce-fill-brand-strong)"
        hiddenFrom="sm"
        leftSection={<IconPlus size={20} />}
        onClick={handleCreate}
        size={'md'}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom) + 60px)',
          right: 'var(--mantine-spacing-md)',
          boxShadow: 'var(--ce-shadow-raised)',
          zIndex: 100,
        }}
        variant="filled"
      >
        New
      </Button>
    </PageWrapper>
  );
};

export default LibraryListPage;
