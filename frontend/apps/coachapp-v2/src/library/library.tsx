import {Link} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';

interface LibrarySection {
  description: string;
  label: string;
  path: string;
}

const SECTIONS: LibrarySection[] = [
  {
    description: 'Manage your exercise database',
    label: 'Exercises',
    path: ROUTES.EXERCISES,
  },
  {
    description: 'Track individual food items',
    label: 'Foods',
    path: ROUTES.FOODS,
  },
  {
    description: 'Create and manage recipes',
    label: 'Recipes',
    path: ROUTES.RECIPES,
  },
  {
    description: 'Build meal-based nutrition plans',
    label: 'Nutrition Plans',
    path: ROUTES.NUTRITION_PLANS,
  },
  {
    description: 'Design periodized training plans',
    label: 'Training Plans',
    path: ROUTES.TRAINING_PLANS,
  },
];

export default function Library() {
  return (
    <PageLayout
      description="Your exercises, foods, recipes, and plans"
      title="Library"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            className="flex min-h-11 flex-col gap-1 rounded-xl border border-divider bg-content1 p-4 transition-colors hover:bg-content2 active:bg-content2"
            key={section.path}
            to={section.path}
          >
            <span className="text-sm font-semibold">{section.label}</span>
            <span className="text-xs text-foreground-500">{section.description}</span>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
