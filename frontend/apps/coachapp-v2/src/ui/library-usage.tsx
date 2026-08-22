import {Typography} from '@heroui/react';
import {generatePath, Link} from 'react-router-dom';
import type {LibraryImpact, LibraryUsageItem} from '@/foods/library-impact';
import {hasLibraryUsage} from '@/foods/library-impact';
import {ROUTES} from '@/routes';
import {DETAIL_SECTION_CLASS, DetailSectionHeading} from '@/ui/detail-section-heading';

type UsageGroup = {items: LibraryUsageItem[]; title: string; to: (id: string) => string};

export function LibraryUsageSection({impact}: {impact: LibraryImpact}) {
  if (!hasLibraryUsage(impact)) {
    return null;
  }

  const groups: UsageGroup[] = [
    {
      title: 'Recipes',
      items: impact.recipes,
      to: (id: string) => generatePath(ROUTES.RECIPE_DETAIL, {id}),
    },
    {
      title: 'Templates',
      items: impact.templates,
      to: (id: string) => generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id}),
    },
    {
      title: 'Client plans',
      items: impact.active_client_plans,
      to: (id: string) => generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id}),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <section className={DETAIL_SECTION_CLASS}>
      <DetailSectionHeading title="Used in" />
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.title}>
            <Typography
              color="muted"
              type="body-sm"
            >
              {group.title}
            </Typography>
            <div className="mt-2 flex flex-col gap-2">
              {group.items.map((item) => (
                <Link
                  className="rounded-card border border-border bg-surface px-4 py-3"
                  key={item.id}
                  to={group.to(item.id)}
                >
                  <Typography
                    type="body-sm"
                    weight="semibold"
                  >
                    {item.name}
                  </Typography>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
