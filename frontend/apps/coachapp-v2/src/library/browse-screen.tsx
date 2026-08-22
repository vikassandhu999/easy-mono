import {isOneOf} from '@easy/utils/closed-vocabulary';
import type {Key} from '@heroui/react';
import {Button, SearchField, Separator, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {cn} from '@heroui/styles';
import {type ReactNode, useSyncExternalStore} from 'react';
import {useNavigate} from 'react-router-dom';
import {BackButton} from '@/ui/back-button';
import BrowseListBox from '@/ui/browse-list-box';
import {Page} from '@/ui/page';

/** Mirrors Tailwind's `sm` breakpoint for copy that changes with the rendered layout. */
const SM_QUERY = '(min-width: 640px)';
const subscribeSm = (onChange: () => void) => {
  const mq = window.matchMedia(SM_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const useIsSm = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches);

/**
 * A whole browse screen: header, toolbar, search, filter pills, list surface,
 * rows, and every load/empty/error state.
 *
 * This exists because `BrowseListBox` owned only the rows and handed the
 * surrounding chrome to callers as exported class strings. Eight screens each
 * imported a different subset and assembled it by hand, so 46% of all
 * list-screen code was duplicated chrome that drifted: four screens had four
 * different toolbars, and `list-clients` had retyped the surface class inline
 * and silently dropped two utilities from it.
 *
 * So: no class-string props, and no `ReactNode` slot where a shape would do.
 * Callers pass domain facts only. If a list needs a look this interface can't
 * express, change it here — that is the point of the module.
 *
 * Anatomy (all optional parts collapse when their prop is omitted):
 *
 *   Page.Header   backTo? · title · description? · action?
 *   Page.Toolbar  search? · divider · filters?
 *   Page.Content  surface card > rows | skeleton | empty | error > load-more
 */

/** A page-header button. Every one in the app navigates, so it takes a route. */
type BrowseAction = {
  icon?: ReactNode;
  label: string;
  /** Route to navigate to on press. */
  to: string;
};

type BrowseFilter<Id extends string> = {
  count?: number;
  id: Id;
  label: string;
  /** Mobile pill label, when the full one is too long (COPY.md). */
  shortLabel?: string;
};

/**
 * The result of the screen's data hook. One prop rather than five, because
 * these five always travel together and always come from the same hook.
 *
 * `fetchNextPage` absent means a flat list — the load-more sentinel is simply
 * not rendered, instead of every flat screen remembering to pass
 * `fetchNextPage={() => undefined}`.
 */
type BrowseQuery<T> = {
  fetchNextPage?: () => void;
  isError?: boolean;
  isLoading: boolean;
  items: T[];
  refetch?: () => void;
};

type Props<T extends object, Id extends string> = {
  action?: BrowseAction;
  /**
   * A header-level control that is a setting, not a navigation action: inline
   * before the action button from `sm` up, and on its own full-width line below
   * the title on mobile (the header wraps for it). ONE caller: the default-intake
   * control on the forms list, placed beside "Create form" by product decision
   * (2026-08-15, `prototype/default-intake-placement`). Same rule as `toolbarEnd`:
   * a second caller means modelling it properly, not reaching for the slot.
   */
  actionsExtra?: ReactNode;
  /** Route for the header back button. Library lists have one; top-level ones don't. */
  backTo?: string;
  description?: ReactNode;
  /** Shown when the query succeeds with zero rows (never for loading or error). */
  empty: ReactNode;
  filters?: {
    onSelect: (id: Id) => void;
    options: BrowseFilter<Id>[];
    selected: Id;
  };
  onOpen?: (key: Key) => void;
  query: BrowseQuery<T>;
  row: (item: T) => ReactNode;
  /** Round leading blocks in the loading skeleton, for rows with an avatar. */
  rowHasThumb?: boolean;
  search?: {
    onChange: (value: string) => void;
    placeholder: string;
    /** Shorter placeholder below `sm`, where the field is narrow. */
    shortPlaceholder?: string;
    value: string;
  };
  /**
   * Style-diff anchor prefix. Every part derives its id from it, matching the
   * convention the manifests already use: `np` yields `np-title`, `np-subtitle`,
   * `np-create`, `np-search`, `np-pill-on` / `np-pill-off`, `np-pill-count`,
   * `np-card`.
   */
  testId?: string;
  title: string;
  /** Shorter title below `sm` ("Nutrition" for "Nutrition plans"). */
  shortTitle?: string;
  /**
   * Toolbar row count, rendered as "{total} {title}". The three library lists
   * all spelled it that way, so the noun comes from the title rather than a
   * second prop.
   */
  total?: number | undefined;
  /**
   * ONE caller: the muscle multi-select on the exercises list. It is a genuinely
   * different control, not a variant of `filters`, and a seam with one adapter
   * is a hypothetical seam — so this stays a plain slot instead of being modelled.
   *
   * If a second caller ever appears, model it properly and delete this. Do not
   * reach for it to nudge a toolbar's layout: that is how the seven exported
   * class constants this module replaced got their reach in the first place.
   */
  toolbarEnd?: ReactNode;
  toolbarExtra?: ReactNode;
};

/**
 * Canonical chrome. These were seven exported constants that call sites imported
 * in different combinations; they are private now so a screen cannot take half
 * the look. Values are the majority spelling across the eight screens — the
 * header string was already identical on seven of them.
 */
// `flex-wrap` carries `actionsExtra` onto its own line below the title on mobile;
// with no such child nothing wraps, so it is a no-op for the other seven screens.
const HEADER = 'flex-wrap bg-surface pb-1 sm:bg-transparent sm:pb-2';

// `flex-wrap` is a superset: with no filter row nothing wraps, so one toolbar
// serves both shapes. Only the mobile bottom padding differs — the pill row
// brings its own, so the toolbar drops it when filters are present.
const TOOLBAR =
  'sticky top-0 z-10 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0 border-b border-border bg-surface pt-2 ' +
  'sm:mb-6 sm:gap-3 sm:border-0 sm:bg-background sm:pb-3';

const SEARCH_GROUP =
  'min-h-9 gap-2 rounded-control border border-border bg-background type-body leading-[normal] [box-shadow:none] text-muted sm:bg-surface';

/**
 * Vertical rule between search and filters. HeroUI's separator recipe is
 * align-self:stretch, which with a capped height pins it to the flex line's
 * TOP — `self-center` is load-bearing.
 */
const DIVIDER = 'hidden h-6 self-center sm:block';

/**
 * Ink-selected filter pill (RECIPES.md R2). HeroUI exposes selection as
 * `data-selected="true"`; there is no `selected:` Tailwind variant registered in
 * this project, so `selected:*` classes silently no-op.
 */
/**
 * The whole look is the `--filter` variant in `index.css` (underline row below
 * `sm`, ink pill above). It used to be four lines of Tailwind here, which is how
 * the desktop pill ended up at 14px where the dc.html's `.pill` says 12.5px.
 */
const FILTER_PILL = 'toggle-button--filter';

/** Zero-gutter on mobile (full-bleed list); Page.Frame owns the gutter from sm up. */
const FRAME = 'flex flex-1 flex-col px-0 pb-0 sm:px-4 sm:pb-6';

const SURFACE =
  'overflow-hidden border-y border-border bg-background leading-[normal] text-foreground sm:rounded-card sm:border sm:bg-surface';

/** The count beside a pill label. Mobile carries it on the selected pill only. */
function FilterCount({
  count,
  countTestId,
  isSelected,
}: {
  count: number;
  countTestId?: string | undefined;
  isSelected: boolean;
}) {
  return (
    <span
      className={cn('ml-1 type-body font-light opacity-70 sm:ml-0', isSelected ? undefined : 'hidden sm:inline')}
      data-testid={isSelected ? countTestId : undefined}
    >
      {/* A non-breaking space, not a JSX one: the pill is a flex container, so
          whitespace between children collapses and "Active 6" reads "Active6". */}
      {'\u00a0'}
      {count}
    </span>
  );
}

export default function BrowseScreen<T extends object, Id extends string>({
  action,
  actionsExtra,
  backTo,
  description,
  empty,
  filters,
  onOpen,
  query,
  row,
  rowHasThumb,
  search,
  shortTitle,
  testId,
  title,
  total,
  toolbarEnd,
  toolbarExtra,
}: Props<T, Id>) {
  const navigate = useNavigate();
  // The search placeholder is an attribute, not a text node, so the short form
  // cannot be swapped with a CSS breakpoint the way the title and pills are.
  const isSm = useIsSm();
  const filterIds = filters?.options.map(({id}) => id) ?? [];

  return (
    <Page>
      <Page.Header
        className={HEADER}
        size="content"
      >
        <Page.TitleGroup className={backTo ? 'flex min-w-0 items-center' : undefined}>
          {backTo ? (
            // Below lg there is no sidebar and no bottom nav on library lists,
            // so this is the only way back to the hub.
            <BackButton
              className="lg:hidden"
              onPress={() => navigate(backTo)}
            />
          ) : null}
          <div className="min-w-0">
            <Page.Title testId={testId ? `${testId}-title` : undefined}>
              {shortTitle ? (
                <>
                  <span className="sm:hidden">{shortTitle}</span>
                  <span className="hidden sm:inline">{title}</span>
                </>
              ) : (
                title
              )}
            </Page.Title>
            {description === undefined ? null : (
              <Page.Description
                className="hidden truncate sm:block"
                testId={testId ? `${testId}-subtitle` : undefined}
              >
                {description}
              </Page.Description>
            )}
          </div>
        </Page.TitleGroup>
        {/* Its own flex child, not a child of Page.Actions: only then can it take
            a full-width line on mobile while the action button stays up beside
            the title. `order-last` puts it after the button in the flex order. */}
        {actionsExtra ? <div className="order-last w-full sm:order-none sm:w-auto">{actionsExtra}</div> : null}
        {action ? (
          <Page.Actions>
            <Button
              aria-label={action.label}
              className="tap-target rounded-control"
              data-testid={testId ? `${testId}-create` : undefined}
              onPress={() => navigate(action.to)}
              variant="primary"
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          </Page.Actions>
        ) : null}
      </Page.Header>

      {search || filters || toolbarExtra || toolbarEnd ? (
        <Page.Toolbar
          className={cn(TOOLBAR, filters ? 'pb-0' : 'pb-3')}
          size="content"
        >
          {search ? (
            <SearchField
              aria-label={search.placeholder}
              className="w-full min-w-0 sm:max-w-64 sm:flex-1"
              onChange={search.onChange}
              value={search.value}
            >
              <SearchField.Group
                className={SEARCH_GROUP}
                data-testid={testId ? `${testId}-search` : undefined}
              >
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={!isSm && search.shortPlaceholder ? search.shortPlaceholder : search.placeholder}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          ) : null}

          {/* Filters sit on their own row below the search field on mobile, in
              equal columns so their edges line up with it — an auto-width
              trigger left a ragged gap beside a full-width input. `mt-2` is the
              row gap: the toolbar's own is `gap-y-0` because the pill row below
              brings its own spacing, so this row asks for its own. From `sm` up
              they join the search field inline at their natural width. */}
          {toolbarExtra ? (
            <div className="mt-2 grid w-full grid-cols-2 gap-3 sm:mt-0 sm:flex sm:w-auto">{toolbarExtra}</div>
          ) : null}

          {total === undefined ? null : (
            <span className="ms-auto hidden shrink-0 type-body text-muted sm:block">
              {total} {title.toLowerCase()}
            </span>
          )}

          {search && filters ? (
            <Separator
              className={DIVIDER}
              orientation="vertical"
            />
          ) : null}

          {filters ? (
            <div className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <ToggleButtonGroup
                aria-label={`Filter ${title.toLowerCase()}`}
                className="flex w-max flex-nowrap gap-2"
                isDetached
                onSelectionChange={(keys: Set<Key>) => {
                  const next = [...keys][0];
                  if (isOneOf(filterIds, next)) {
                    filters.onSelect(next);
                  }
                }}
                selectedKeys={[filters.selected]}
                selectionMode="single"
              >
                {filters.options.map((option) => (
                  <ToggleButton
                    className={FILTER_PILL}
                    data-testid={testId ? `${testId}-pill-${option.id === filters.selected ? 'on' : 'off'}` : undefined}
                    id={option.id}
                    key={option.id}
                  >
                    <span className={option.shortLabel ? 'hidden sm:inline' : undefined}>{option.label}</span>
                    {option.shortLabel ? <span className="sm:hidden">{option.shortLabel}</span> : null}
                    {option.count === undefined ? null : (
                      <FilterCount
                        count={option.count}
                        countTestId={testId ? `${testId}-pill-count` : undefined}
                        isSelected={option.id === filters.selected}
                      />
                    )}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          ) : null}

          {/* The design pushes CL's sort control to the far end of this row
              (`margin-left:auto`), after the filter pills. */}
          {toolbarEnd ? <div className="ms-auto hidden shrink-0 sm:block">{toolbarEnd}</div> : null}
        </Page.Toolbar>
      ) : null}

      <Page.Content bare>
        <Page.Frame
          className={FRAME}
          size="content"
        >
          <div
            className={SURFACE}
            data-testid={testId ? `${testId}-card` : undefined}
          >
            <BrowseListBox
              ariaLabel={title}
              className="flex-1 gap-0 p-0"
              emptyState={empty}
              // A flat query has no next page; render no sentinel rather than
              // making every flat caller pass a no-op.
              fetchNextPage={query.fetchNextPage ?? (() => undefined)}
              isError={query.isError}
              isLoading={query.isLoading}
              items={query.items}
              onAction={onOpen}
              onRetry={query.refetch}
              renderItem={row}
              skeletonAvatar={rowHasThumb}
            />
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
