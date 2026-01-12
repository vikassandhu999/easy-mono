import {ScrollShadow, Tabs} from '@heroui/react';
import {IconBarbell, IconChefHat, IconRun, IconSalad} from '@tabler/icons-react';

import {DRAWER_KEYS} from '@/configs';

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

type Props = {
  tab: LibraryCategoryValue;
  onTabChange: (tab: LibraryCategoryValue) => void;
};

const CategoryTabs = ({tab, onTabChange}: Props) => {
  return (
    <ScrollShadow
      className="max-w-[90vw]"
      hideScrollBar
      orientation="horizontal"
      size={0}
    >
      <Tabs
        className={'w-full'}
        onSelectionChange={(selection) => onTabChange(selection?.toString() as LibraryCategoryValue)}
        selectedKey={tab}
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
  );
};

export default CategoryTabs;
