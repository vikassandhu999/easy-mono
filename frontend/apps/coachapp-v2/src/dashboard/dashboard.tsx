import {getInitials} from '@easy/utils';
import {Avatar, Button, Separator, Skeleton, Surface, Typography} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Fragment} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useListClientsQuery} from '@/api/clients';
import {useCoachConversationsInfiniteQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useListProspectsQuery} from '@/api/prospects';
import {DashboardSectionHeading} from '@/dashboard/components/dashboard-section-heading';
import {QuickActionsRow} from '@/dashboard/components/quick-actions-row';
import {RecentActivityCell} from '@/dashboard/components/recent-activity-cell';
import {TodayCell} from '@/dashboard/components/today-cell';
import {DashboardSetupCell} from '@/dashboard/dashboard-setup-cell';
import {formatDashboardDate} from '@/dashboard/lib/date-format';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

// RECIPES.md R9 — the date eyebrow above the greeting.
const EYEBROW = 'type-eyebrow font-semibold uppercase tracking-wider text-muted';

/**
 * GAPS #1 — the glance bar is a `Surface` holding two stat blocks (`Typography`
 * number + label) with a vertical `Separator` between. No custom stat component
 * and no Card per number.
 *
 * The blocks stay pressable (they deep-link to CL) — that behaviour predates the
 * redesign and the ref doesn't contradict it, so it's kept rather than dropped.
 */
function StatBar({
  active,
  className,
  isError,
  pending,
}: {
  active: number;
  className?: string;
  isError: boolean;
  pending: number;
}) {
  const navigate = useNavigate();
  const cells = [
    {label: 'Active clients', value: isError ? null : active},
    {label: 'Pending invites', value: isError ? null : pending},
  ];

  return (
    <Surface className={cn('flex items-stretch overflow-hidden rounded-card border border-border', className)}>
      {cells.map((cell, index) => (
        <Fragment key={cell.label}>
          {index > 0 ? (
            <Separator
              className="self-stretch"
              orientation="vertical"
            />
          ) : null}
          {/* `button--row` is the theme's release from the control tier — a stat
              cell is sized by its two lines, and `--spacing-control` clipped them. */}
          <Button
            className="button--row flex-1 flex-col items-start justify-center gap-px rounded-none px-5 py-2"
            onPress={() => navigate(ROUTES.CLIENTS)}
            variant="ghost"
          >
            <Typography
              className="type-metric font-grotesk font-semibold tabular-nums"
              type="h4"
            >
              {cell.value ?? '—'}
            </Typography>
            <Typography
              className="whitespace-nowrap type-eyebrow font-normal"
              color="muted"
              type="body-sm"
            >
              {cell.label}
            </Typography>
          </Button>
        </Fragment>
      ))}
    </Surface>
  );
}

function DashboardSkeleton() {
  return (
    <Page>
      <Page.Header
        className="items-end"
        size="wide"
      >
        <Page.TitleGroup>
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-2 h-8 w-56 max-w-full rounded-chip" />
        </Page.TitleGroup>
        <Skeleton className="hidden h-16 w-56 rounded-card sm:block" />
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <Skeleton className="h-16 w-full rounded-card" />
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <Skeleton className="h-80 w-full rounded-card" />
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

export default function Dashboard() {
  const {data: profileData, isLoading: profileLoading} = useGetCoachProfileQuery();
  // Summary counts only — the queue rows moved to the workbench.
  const {data: clientsData, isError: clientsError, isLoading: clientsLoading} = useListClientsQuery({limit: 0});
  const {
    data: prospectsData,
    isError: prospectsError,
    isLoading: prospectsLoading,
  } = useListProspectsQuery({limit: 5, status: 'new'});
  const {data: conversationsData, isError: conversationsError} = useCoachConversationsInfiniteQuery();

  if (profileLoading || clientsLoading || prospectsLoading) {
    return <DashboardSkeleton />;
  }

  const profile = profileData?.data;
  const name = profile?.first_name?.trim();
  const initials = getInitials(profile?.first_name, profile?.last_name) || '?';
  const clientSummary = clientsData?.summary;
  const newProspects = prospectsError ? [] : (prospectsData?.data ?? []);

  return (
    <Page>
      <Page.Header
        className="items-end"
        size="wide"
      >
        <Page.TitleGroup>
          <div className={EYEBROW}>{formatDashboardDate()}</div>
          <Page.Title className="mt-1.5 font-grotesk">{name ? `${greeting()}, ${name}` : greeting()}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions className="sm:hidden">
          {/* The only sub-lg Settings entry point since the mobile top bar was removed. */}
          <Link
            aria-label="Settings"
            to={ROUTES.SETTINGS}
          >
            <Avatar className="size-11">
              <Avatar.Fallback className="bg-warning-soft font-semibold text-warning-soft-foreground">
                {initials}
              </Avatar.Fallback>
            </Avatar>
          </Link>
        </Page.Actions>
        <StatBar
          active={clientSummary?.active ?? 0}
          className="hidden sm:flex"
          isError={clientsError}
          pending={clientSummary?.pending ?? 0}
        />
      </Page.Header>

      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-5 pb-8 pt-4"
          size="wide"
        >
          <StatBar
            active={clientSummary?.active ?? 0}
            className="sm:hidden"
            isError={clientsError}
            pending={clientSummary?.pending ?? 0}
          />

          {profile?.is_owner ? (
            <DashboardSetupCell hiddenReason={profile.business.dashboard_setup_hidden_reason} />
          ) : null}

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <TodayCell leadCount={newProspects.length} />

            <div className="flex min-w-0 flex-col gap-5">
              <RecentActivityCell
                conversations={conversationsData?.pages[0]?.data ?? []}
                isError={conversationsError}
              />
              <section className="flex min-w-0 flex-col gap-3">
                <DashboardSectionHeading title="Quick actions" />
                <QuickActionsRow />
              </section>
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
