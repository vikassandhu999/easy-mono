import {getInitials} from '@easy/utils';
import {Avatar, Button, Dropdown, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {CalendarCheck, Dumbbell, LayoutGrid, MailCheck, MessageCircle, MoreHorizontal, Utensils} from 'lucide-react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {EmptyState} from '@/@components/empty-state';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGetClientQuery} from '@/api/clients';
import {useListCoachClientTrainingPlansQuery} from '@/api/generated';
import {CheckinsTab} from '@/clients/client-screen/checkins-tab';
import {NutritionTab} from '@/clients/client-screen/nutrition-tab';
import {OverviewTab} from '@/clients/client-screen/overview-tab';
import {TrainingTab} from '@/clients/client-screen/training-tab';
import {ClientStatStrip} from '@/clients/components/client-stat-strip';
import {ClientStatusChips} from '@/clients/components/client-status-chips';
import {getFullName} from '@/clients/lib/invite-client';

/**
 * The single-client workspace: identity header, live stat bar, and pill tabs
 * switching the body (CD-OV / CD-NU / CD-TR / CD-CI).
 *
 * The interface is `<ClientScreen />` — it reads `:id` and `?tab=` itself, so the
 * router entry is one line. Everything a client screen needs to know sits behind
 * that: the fetch, the skeleton, the error, the four scenarios, the header, the
 * stat bar, the tab row, and which body to render. The four tab bodies are
 * INTERNAL parts, not interface: each takes `{client}` and nothing else, so they
 * are swappable without any caller learning about them.
 *
 * Deleting this module is the test: the header, stat bar, tab row and all four
 * loading paths would reappear in each tab file — which is exactly the shape the
 * 550-line predecessor had.
 *
 * `?tab=` rather than component state, because the attention chips and the
 * dashboard link INTO a specific tab, and a coach who lands on Training should be
 * able to share or reload that.
 *
 * The design (prototype line 907) treats pending / onboarding / expiring /
 * inactive as SCENARIOS of this screen rather than separate screens: the same
 * chrome throughout, with the state expressed by the chip row and by stat cells
 * reading "No plan". So there is no branch to a different layout here — only
 * `hasAccess`, which decides whether the tabs are meaningful at all. An invited
 * client has never logged anything, so tabs over empty bodies would be four ways
 * to see nothing.
 */
const TABS = [
  {Icon: LayoutGrid, id: 'overview', label: 'Overview'},
  {Icon: Utensils, id: 'nutrition', label: 'Nutrition'},
  {Icon: Dumbbell, id: 'training', label: 'Training'},
  {Icon: CalendarCheck, id: 'checkins', label: 'Check-ins'},
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ClientScreen() {
  const {id = ''} = useParams<{id: string}>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useGetClientQuery(id);

  const requested = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'overview';

  // "3 of 4": the target is how many DISTINCT weekdays the active plan schedules,
  // which is what the design's "4 days a week" counts. There is no `days_per_week`
  // field on a plan — it is derived from the plan items' `day_of_week`.
  const plans = useListCoachClientTrainingPlansQuery({clientId: id, status: 'active'});
  const activePlan = plans.data?.data?.[0];
  const weeklyTarget = activePlan ? new Set(activePlan.plan_items.map((item) => item.day_of_week)).size || null : null;

  if (isLoading) {
    return (
      <Page>
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
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <ErrorState
              message="Couldn't load this client."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const client = data.data;
  const name = getFullName(client.first_name, client.last_name);
  const detailPath = (route: string) => route.replace(':id', client.id);
  // A client who has not accepted their invite has no sessions, meals, weight or
  // check-ins by definition — the design shows the header and stat bar, not tabs.
  const hasAccess = client.status !== 'pending';

  return (
    <Page>
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
          <div className="rounded-card border border-border bg-surface">
            <div className="flex flex-wrap items-start gap-3 p-4 sm:gap-4">
              <Avatar className="size-12 shrink-0 sm:size-14">
                <Avatar.Fallback className="bg-accent type-title font-semibold text-accent-foreground">
                  {getInitials(client.first_name, client.last_name)}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Page.Title>{name || 'Client'}</Page.Title>
                <div className="mt-1.5">
                  <ClientStatusChips client={client} />
                </div>
                {client.phone && (
                  <Typography
                    className="mt-1.5"
                    color="muted"
                    type="body-sm"
                  >
                    {client.phone}
                  </Typography>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  onPress={() => navigate(detailPath(ROUTES.CLIENT_MESSAGES))}
                  variant="primary"
                >
                  <MessageCircle />
                  Message
                </Button>
                {/* `Dropdown`, not `Menu` — the app's existing action menus
                    (`plan-actions-menu`) are Dropdown, and one idiom beats two. */}
                <Dropdown>
                  <Button
                    aria-label="Client actions"
                    isIconOnly
                    variant="outline"
                  >
                    <MoreHorizontal />
                  </Button>
                  <Dropdown.Popover>
                    <Dropdown.Menu>
                      <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_DETAILS))}>
                        Details &amp; settings
                      </Dropdown.Item>
                      <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_EDIT))}>
                        Edit client
                      </Dropdown.Item>
                      <Dropdown.Item onAction={() => navigate(detailPath(ROUTES.CLIENT_INTAKE))}>
                        Intake responses
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </div>
            <div className="border-t border-border">
              <ClientStatStrip
                client={client}
                weeklyTarget={weeklyTarget}
              />
            </div>
          </div>

          {hasAccess ? (
            <>
              {/* `toggle-button--tab` is the theme's ghost-pill register: transparent
                  until selected, then ink-filled. The strip scrolls on mobile rather
                  than wrapping, as `.mtab`'s `flex:none` does. */}
              <ToggleButtonGroup
                aria-label="Client sections"
                className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
                disallowEmptySelection
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next) {
                    setParams({tab: String(next)}, {replace: true});
                  }
                }}
                selectedKeys={[tab]}
                selectionMode="single"
              >
                {TABS.map(({Icon, id: tabId, label}) => (
                  <ToggleButton
                    className="toggle-button--tab shrink-0"
                    id={tabId}
                    key={tabId}
                  >
                    <Icon />
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {tab === 'overview' && <OverviewTab client={client} />}
              {tab === 'nutrition' && <NutritionTab client={client} />}
              {tab === 'training' && <TrainingTab client={client} />}
              {tab === 'checkins' && <CheckinsTab client={client} />}
            </>
          ) : (
            <PendingBody client={client} />
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/**
 * CD-pending. Not a separate screen — the same header and stat bar above, with the
 * tab row replaced by the one thing that can actually happen next.
 */
function PendingBody({client}: {client: Parameters<typeof ClientStatusChips>[0]['client']}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-card border border-border bg-surface">
      <EmptyState
        action={
          <Button
            onPress={() => navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id))}
            variant="outline"
          >
            Manage invitation
          </Button>
        }
        body={`${client.first_name ?? 'This client'} has not joined yet. Workouts, meals, weight and check-ins appear here once they accept.`}
        icon={MailCheck}
        title="Invite sent"
      />
    </div>
  );
}
