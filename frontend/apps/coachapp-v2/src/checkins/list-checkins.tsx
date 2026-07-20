import {formatIsoDateOnly} from '@easy/utils';
import {
  Button,
  Chip,
  Description,
  Label,
  ListBox,
  SearchField,
  Separator,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight, ClipboardCheck, Plus, UserRoundCheck} from 'lucide-react';
import {useDeferredValue, useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import BrowseListBox, {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {ErrorState} from '@/@components/error-state';
import ListEmptyState from '@/@components/list-empty-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type ClientProfileReviewQueueItem,
  type FormPurpose,
  PURPOSE_LABELS,
  useListCheckInReviewQueueQuery,
  useListFormTemplatesQuery,
} from '@/api/checkins';

import FormTemplateListItem from './form-template-list-item';

type StatusFilter = 'active' | 'all' | 'archived';
type PurposeFilter = 'all' | FormPurpose;

// HeroUI ToggleButton exposes selection as `data-selected="true"` (see
// @heroui/styles toggle-button.css), not a `selected:` Tailwind variant —
// there's no such variant registered in this project, so `selected:*`
// classes silently no-op. Target the data attribute directly. (RECIPES.md R2)
const STATUS_PILL_CLASS =
  'rounded-control border border-border bg-surface px-3.5 py-2 text-pill font-medium text-muted ' +
  'data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:font-semibold ' +
  'data-[selected=true]:text-ink-foreground';

// Secondary form-type filter (RECIPES.md R3 segmented control). Not shown in
// the FM prototype (which only depicts a status-tab row) — kept because it's
// an existing, working filter the prototype simply doesn't depict; restyled
// to the app's segmented-control tokens instead of deleted. See PORT-TICKET.
const PURPOSE_GROUP_CLASS = 'inline-flex gap-0.5 rounded-control border border-border bg-surface p-0.5';
const PURPOSE_BUTTON_CLASS =
  'rounded-chip border-0 px-3 py-1.5 text-pill font-medium text-muted ' +
  'data-[selected=true]:bg-ink data-[selected=true]:font-semibold data-[selected=true]:text-ink-foreground';

function matchesSearch(name: string, search: string): boolean {
  return name.toLowerCase().includes(search.trim().toLowerCase());
}

function reviewClientName(item: ClientProfileReviewQueueItem): string {
  return [item.client.first_name, item.client.last_name].filter(Boolean).join(' ') || 'Client';
}

// Restyled per FM/FB "not in the prototype (don't invent)" — INTERACTIONS.md
// keeps this working feature, just brought onto §2 components + tokens.
function ReviewQueueListItem({item}: {item: ClientProfileReviewQueueItem}) {
  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'gap-3 rounded-none border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
      )}
      id={item.id}
      textValue={reviewClientName(item)}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-soft">
        <ClipboardCheck className="size-5 text-warning-soft-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{reviewClientName(item)}</Label>
        <Description className="max-w-full truncate text-xs text-muted">
          {item.form_assignment.form_template.name} · {formatIsoDateOnly(item.submitted_at)}
        </Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Chip
          size="sm"
          variant="soft"
        >
          Review
        </Chip>
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}

function ReviewQueue() {
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useListCheckInReviewQueueQuery();
  const items = data?.data ?? [];

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <BrowseListBox
        ariaLabel="Check-ins to review"
        className="p-0"
        emptyState={
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <UserRoundCheck
              className="text-success"
              size={28}
            />
            <Label className="text-sm font-semibold text-foreground">All caught up</Label>
            <Description className="text-xs text-muted">Submitted check-ins will appear here.</Description>
          </div>
        }
        fetchNextPage={() => undefined}
        isError={isError}
        isLoading={isLoading}
        items={items}
        onAction={(key) => navigate(ROUTES.CHECKIN_REVIEW.replace(':id', String(key)))}
        onRetry={refetch}
        renderItem={(item) => <ReviewQueueListItem item={item} />}
      />
    </div>
  );
}

export default function ListCheckins() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const {data, isError, isLoading, refetch} = useListFormTemplatesQuery();
  const templates = data?.data ?? [];
  const {data: reviewData} = useListCheckInReviewQueueQuery();
  const activeTab = searchParams.get('tab') === 'review' ? 'review' : 'templates';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [purpose, setPurpose] = useState<PurposeFilter>('all');
  const deferredSearch = useDeferredValue(search);

  // The form-templates endpoint has no query params (see `listFormTemplates`
  // in `api/generated.ts`) — it always returns the full set, so search/status/
  // purpose filtering all compose client-side, same as clients' "attention" tab.
  const counts = useMemo(
    () => ({
      active: templates.filter((template) => template.status === 'active').length,
      all: templates.length,
      archived: templates.filter((template) => template.status === 'archived').length,
    }),
    [templates],
  );

  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          (status === 'all' || template.status === status) &&
          (purpose === 'all' || template.purpose === purpose) &&
          matchesSearch(template.name, deferredSearch),
      ),
    [templates, status, purpose, deferredSearch],
  );

  const hasFilter = !!deferredSearch || status !== 'all' || purpose !== 'all';

  return (
    <Page className="bg-background">
      <Page.Header size="list">
        <Page.TitleGroup className="flex items-center">
          <BackButton
            className="lg:hidden"
            onPress={goBack}
          />
          <div className="min-w-0">
            <Page.Title>Forms</Page.Title>
            <Page.Description className="hidden truncate sm:block">
              Intake, check-in, and questionnaire forms for your clients
            </Page.Description>
          </div>
        </Page.TitleGroup>
        <Page.Actions>
          {activeTab === 'templates' ? (
            <Button
              aria-label="Create form"
              onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
              variant="primary"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create form</span>
            </Button>
          ) : null}
        </Page.Actions>
      </Page.Header>

      <Page.Toolbar
        className="sticky top-0 z-10 flex flex-col gap-3 bg-background pt-2 pb-3"
        size="list"
      >
        <Tabs
          aria-label="Forms sections"
          onSelectionChange={(key) => setSearchParams(key === 'review' ? {tab: 'review'} : {}, {replace: true})}
          selectedKey={activeTab}
        >
          <Tabs.ListContainer className="max-w-full overflow-x-auto">
            <Tabs.List>
              <Tabs.Tab id="templates">
                Templates
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="review">
                To review{reviewData ? ` (${reviewData.data.length})` : ''}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        {activeTab === 'templates' ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <SearchField
                aria-label="Search forms"
                className="w-full min-w-0 sm:max-w-72 sm:flex-1"
                onChange={setSearch}
                value={search}
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search forms…" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <Separator
                className="hidden h-6 sm:block"
                orientation="vertical"
              />
              <div className="shrink-0">
                <ToggleButtonGroup
                  aria-label="Filter forms by status"
                  className="flex flex-nowrap gap-2"
                  isDetached
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) {
                      setStatus(next as StatusFilter);
                    }
                  }}
                  selectedKeys={[status]}
                  selectionMode="single"
                >
                  <ToggleButton
                    className={STATUS_PILL_CLASS}
                    id="all"
                  >
                    All <span className="text-chip opacity-70">{counts.all}</span>
                  </ToggleButton>
                  <ToggleButton
                    className={STATUS_PILL_CLASS}
                    id="active"
                  >
                    Active <span className="text-chip opacity-70">{counts.active}</span>
                  </ToggleButton>
                  <ToggleButton
                    className={STATUS_PILL_CLASS}
                    id="archived"
                  >
                    Archived <span className="text-chip opacity-70">{counts.archived}</span>
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
              {/* Purpose filter has no prototype frame (FM shows status pills only);
                  kept as a working feature, docked in the same toolbar row so the
                  toolbar stays one line like the ref. */}
              <ToggleButtonGroup
                aria-label="Filter forms by type"
                className={`${PURPOSE_GROUP_CLASS} sm:ms-auto`}
                isDetached
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next) {
                    setPurpose(next as PurposeFilter);
                  }
                }}
                selectedKeys={[purpose]}
                selectionMode="single"
              >
                <ToggleButton
                  className={PURPOSE_BUTTON_CLASS}
                  id="all"
                >
                  All
                </ToggleButton>
                <ToggleButton
                  className={PURPOSE_BUTTON_CLASS}
                  id="intake"
                >
                  {PURPOSE_LABELS.intake}
                </ToggleButton>
                <ToggleButton
                  className={PURPOSE_BUTTON_CLASS}
                  id="check_in"
                >
                  {PURPOSE_LABELS.check_in}
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
          </>
        ) : null}
      </Page.Toolbar>

      <Page.Content>
        <Page.Frame
          className="flex min-h-0 flex-1 flex-col pb-6"
          size="list"
        >
          {activeTab === 'review' ? (
            <ReviewQueue />
          ) : isError ? (
            <ErrorState message="Couldn't load forms." />
          ) : (
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              <BrowseListBox
                ariaLabel="Forms"
                className="p-0"
                emptyState={
                  <ListEmptyState
                    createLabel="Create form"
                    createRoute={ROUTES.CREATE_CHECKIN}
                    emptyDescription="Build intake and check-in forms for your clients."
                    hasFilter={hasFilter}
                    nounPlural="forms"
                  />
                }
                fetchNextPage={() => undefined}
                isError={isError}
                isLoading={isLoading}
                items={visibleTemplates}
                onAction={(key) => navigate(ROUTES.EDIT_CHECKIN.replace(':id', String(key)))}
                onRetry={refetch}
                renderItem={(template) => <FormTemplateListItem template={template} />}
              />
            </div>
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
