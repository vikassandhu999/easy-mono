import {Typography} from '@heroui/react';
import {Link} from 'react-router-dom';

import {Page} from '@/@components/page';
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
  {
    description: 'Build check-in & intake forms',
    label: 'Check-ins',
    path: ROUTES.CHECKINS,
  },
];

export default function Library() {
  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Library</Page.Title>
          <Page.Description>Your exercises, foods, recipes, and plans</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link
              className="flex min-h-11 flex-col gap-1 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover active:bg-surface-hover"
              key={section.path}
              to={section.path}
            >
              <Typography
                type="body-sm"
                weight="semibold"
              >
                {section.label}
              </Typography>
              <Typography
                color="muted"
                type="body-xs"
              >
                {section.description}
              </Typography>
            </Link>
          ))}
        </div>
      </Page.Content>
    </Page>
  );
}
