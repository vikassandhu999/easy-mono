import {Chip, Typography} from '@heroui/react';
import {Utensils} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListCoachMealLogsQuery} from '@/api/generated';
import {SectionCard} from '@/clients/components/section-card';
import {formatKcal, formatRowDate} from '@/clients/lib/client-detail-data';

/** CD-ND — one day's meal log: day totals against target, then a card per meal. */
export default function NutritionDay() {
  const {date = '', id = ''} = useParams<{date: string; id: string}>();
  const goBack = useGoBack(`${ROUTES.CLIENT_DETAIL.replace(':id', id)}?tab=nutrition`);
  const {data, isError, isLoading, refetch} = useListCoachMealLogsQuery({clientId: id, date});

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <Page.Title>{date ? formatRowDate(date) : 'Day'}</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load this day."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const logs = data.data;
  const totals = logs.reduce(
    (acc, log) => {
      acc.kcal += log.logged_calories ?? 0;
      acc.target += log.planned_calories ?? 0;
      for (const entry of log.food_log_entries) {
        acc.protein += entry.protein_g ?? 0;
        acc.carbs += entry.carbs_g ?? 0;
        acc.fat += entry.fat_g ?? 0;
      }
      return acc;
    },
    {carbs: 0, fat: 0, kcal: 0, protein: 0, target: 0},
  );

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          <SectionCard title="Day totals">
            <div className="grid grid-cols-2 gap-4 px-4 pb-4 sm:grid-cols-4">
              <Total
                label="Calories"
                target={totals.target ? `/ ${formatKcal(totals.target)} kcal` : undefined}
                value={formatKcal(totals.kcal)}
              />
              <Total
                label="Protein"
                value={`${Math.round(totals.protein)} g`}
              />
              <Total
                label="Carbs"
                value={`${Math.round(totals.carbs)} g`}
              />
              <Total
                label="Fat"
                value={`${Math.round(totals.fat)} g`}
              />
            </div>
          </SectionCard>

          {logs.map((log) => (
            <SectionCard
              divided
              key={log.id}
              title={`${titleCase(log.meal_slot)}${log.logged_calories ? ` · ${formatKcal(log.logged_calories)} kcal` : ''}`}
            >
              {log.food_log_entries.map((entry) => (
                <div
                  className="flex items-start gap-3 px-4 py-3"
                  key={entry.id}
                >
                  <div className="min-w-0 flex-1">
                    <Typography
                      truncate
                      type="body-sm"
                      weight="semibold"
                    >
                      {entry.food_name ?? 'Food'}
                    </Typography>
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {[
                        entry.protein_g != null ? `P ${Math.round(entry.protein_g)} g` : null,
                        entry.carbs_g != null ? `C ${Math.round(entry.carbs_g)} g` : null,
                        entry.fat_g != null ? `F ${Math.round(entry.fat_g)} g` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </div>
                  {/* Only "Added" is claimable from this endpoint — an entry with no
                      planned_item_index was not in the plan. The design also marks
                      "Swapped" and "Skipped", which need reconciling against
                      planned_snapshot by position; that is untyped here, so a wrong
                      chip is a worse outcome than no chip. Flagged as a follow-up. */}
                  {entry.planned_item_index == null && (
                    <Chip
                      size="sm"
                      variant="tertiary"
                    >
                      Added
                    </Chip>
                  )}
                  <div className="shrink-0 text-right">
                    {entry.amount != null && (
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {Math.round(entry.amount)} g
                      </Typography>
                    )}
                    {entry.calories != null && (
                      <Typography
                        type="body-sm"
                        weight="semibold"
                      >
                        {formatKcal(entry.calories)} kcal
                      </Typography>
                    )}
                  </div>
                </div>
              ))}
              {log.food_log_entries.length === 0 && (
                <div className="px-4 py-3">
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Nothing logged for this meal.
                  </Typography>
                </div>
              )}
            </SectionCard>
          ))}

          {logs.length === 0 && (
            <SectionCard>
              <EmptyState
                body="No meals were logged on this day."
                icon={Utensils}
                title="Nothing logged"
              />
            </SectionCard>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

function Total({label, target, value}: {label: string; target?: string; value: string}) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="mt-1 font-grotesk type-metric font-bold">{value}</div>
      {target && (
        <Typography
          color="muted"
          type="body-xs"
        >
          {target}
        </Typography>
      )}
    </div>
  );
}

/** `meal_slot` is a free-form string from the API ("breakfast", "post_workout"). */
function titleCase(slot: string): string {
  return slot
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
