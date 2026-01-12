import {Button, SearchField} from '@heroui/react';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import ExerciseList from '@/components/ExerciseList';
import PageWrapper, {PageSection} from '@/components/PageWrapper';
import TrainingPlanList from '@/components/TrainingPlanList';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {RecipeList} from '@/shared/RecipeList';

import CategoryTabs, {LibraryCategoryValue} from './CategoryTabs';

const LibraryListPage = () => {
  const {openDrawer} = useParamsDrawer({});

  const [tab, setTab] = useState<LibraryCategoryValue>('training_plan');

  return (
    <PageWrapper>
      <PageSection className="w-full flex-1 sticky top-0 bg-background z-10 pt-4 md:pt-6 flex flex-col gap-2">
        <div className={'flex justify-between items-center'}>
          <CategoryTabs
            onTabChange={setTab}
            tab={tab}
          />
          <Button
            className={'hidden sm:flex'}
            onClick={() => openDrawer(DRAWER_KEYS.TRAINING_PLAN_CREATE)}
            size={'md'}
          >
            <IconPlus size={24} />
            {` Create ${tab.replace('_', ' ')}`}
          </Button>
        </div>

        <SearchField
          className={'mb-6'}
          name="search"
          // onChange={(change) => setTab(change)}
          // value={tab}
        >
          <SearchField.Group className={'h-10'}>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </PageSection>

      <PageSection>
        <div id={'library-list'} />
        {tab === 'recipe' && (
          <RecipeList
            onRecipeClick={() => {}}
            search={''}
          />
        )}
        {tab === 'plan' && (
          <NutritionPlanList
            onPlanClick={() => {}}
            search={''}
          />
        )}
        {tab === 'exercise' && (
          <ExerciseList
            onClick={() => {}}
            search={''}
          />
        )}
        {tab === 'training_plan' && (
          <TrainingPlanList
            onPlanClick={(id) => {
              openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
                training_plan_id: id,
              });
            }}
            search={''}
          />
        )}
      </PageSection>
    </PageWrapper>
  );
};

export default LibraryListPage;
