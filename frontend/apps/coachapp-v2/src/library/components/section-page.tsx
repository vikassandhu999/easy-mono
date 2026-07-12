/**
 * SectionPage — shared Builder section shell (design: Coachez-Builder section
 * page). Header with back/icon/kicker/title/Build-new, search + count, a
 * tile/list view toggle, favourite/last-opened highlight cards, and a card
 * grid with infinite scroll. Each list screen feeds it normalized items.
 */
import {Button, SearchField, Spinner, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Clock, LayoutGrid, List, Plus, RotateCcw, Star} from 'lucide-react';
import {type ReactNode, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import TemplateCard from '@/library/components/template-card';
import type {BuilderItem} from '@/library/lib/builder-items';
import {type BuilderTypeKey, builderType} from '@/library/lib/builder-types';
import {type BuilderRef, isFav, pushRecent, toggleFav, useFavs, useRecents} from '@/library/lib/recents';
import {useBuilderMenuActions} from '@/library/lib/use-menu-actions';

/** Pill filter chip (design: section filter chips, e.g. muscle groups). */
export const filterChip = (active: boolean) =>
  `shrink-0 rounded-full border px-[15px] py-2 text-[13px] font-semibold transition-colors ${
    active
      ? 'border-accent bg-accent text-accent-foreground'
      : 'border-border bg-surface text-muted hover:bg-surface-secondary'
  }`;

interface SectionPageProps {
  /** Total item count shown next to the search field (omit if unknown). */
  count?: number;
  emptyState: ReactNode;
  fetchNextPage: () => void;
  /** Extra filter row rendered above the grid (e.g. muscle chips). */
  filters?: ReactNode;
  hasNextPage?: boolean;
  isError: boolean;
  isFetchingNextPage?: boolean;
  isLoading: boolean;
  items: BuilderItem[];
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  search: string;
  typeKey: BuilderTypeKey;
}

function HighlightCard({item, kind, onOpen}: {item: BuilderRef; kind: 'fav' | 'recent'; onOpen: () => void}) {
  const type = builderType(item.type);
  const Icon = kind === 'fav' ? Star : Clock;
  return (
    <button
      className="rounded-[16px] border border-separator bg-surface p-[15px] text-left transition-all hover:-translate-y-0.5 hover:border-edge hover:shadow-[0_16px_32px_-20px_rgba(24,24,27,0.42)]"
      onClick={onOpen}
      type="button"
    >
      <div className={`mb-3 flex items-center gap-1.5 ${kind === 'fav' ? 'text-star' : 'text-muted'}`}>
        <Icon
          fill={kind === 'fav' ? 'currentColor' : 'none'}
          size={14}
        />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em]">
          {kind === 'fav' ? 'Favourite' : 'Last opened'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`flex size-[38px] shrink-0 items-center justify-center rounded-[11px] ${type.bg}`}>
          <type.icon
            className={type.fg}
            size={19}
            strokeWidth={1.9}
          />
        </span>
        <div className="min-w-0">
          <div className="truncate font-grotesk text-sm font-bold tracking-[-0.01em]">{item.name}</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">{type.label}</div>
        </div>
      </div>
    </button>
  );
}

/** Shared section header: back, icon tile, kicker, title, Build-new (or a custom action). */
export function SectionHeader({action, typeKey}: {action?: ReactNode; typeKey: BuilderTypeKey}) {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const type = builderType(typeKey);
  return (
    <Page.Header className="items-center gap-3 px-[18px] pt-2 pb-0! md:px-9 md:pt-[26px]">
      <Page.TitleGroup className="flex flex-1 items-center gap-3">
        <BackButton
          className="size-[38px]! min-h-0 min-w-0 rounded-[12px]! border-[1.5px]! border-separator bg-transparent hover:bg-surface-secondary"
          onPress={goBack}
        />
        <span className={`hidden size-11 shrink-0 items-center justify-center rounded-[13px] sm:flex ${type.bg}`}>
          <type.icon
            className={type.fg}
            size={22}
            strokeWidth={1.9}
          />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Builder section</div>
          <Page.Title className="mt-0.5 truncate font-grotesk text-[22px]! leading-none! font-bold! tracking-[-0.025em]! md:text-[26px]!">
            {type.group}
          </Page.Title>
        </div>
      </Page.TitleGroup>
      <Page.Actions>
        {action ?? (
          <Button
            aria-label="Build new"
            className="h-11 min-h-11 rounded-[11px]! px-0 text-[13.5px] md:px-[17px]!"
            onPress={() => navigate(type.createRoute)}
            variant="primary"
          >
            <span
              aria-hidden
              className="grid size-10 place-items-center md:contents"
            >
              <Plus
                size={15}
                strokeWidth={2.4}
              />
            </span>
            <span className="sr-only md:not-sr-only">Build new</span>
          </Button>
        )}
      </Page.Actions>
    </Page.Header>
  );
}

export default function SectionPage({
  count,
  emptyState,
  fetchNextPage,
  filters,
  hasNextPage,
  isError,
  isFetchingNextPage,
  isLoading,
  items,
  onRetry,
  onSearchChange,
  search,
  typeKey,
}: SectionPageProps) {
  const type = builderType(typeKey);
  const navigate = useNavigate();
  const [view, setView] = useState<'tile' | 'list'>('tile');
  const favs = useFavs();
  const recents = useRecents();
  const menuActions = useBuilderMenuActions();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const open = (item: {id: string; name: string}) => {
    pushRecent({id: item.id, name: item.name, type: typeKey});
    navigate(type.detailRoute.replace(':id', item.id));
  };

  const favHighlight = favs.find((f) => f.type === typeKey);
  const recentHighlight = recents.find((r) => r.type === typeKey && r.id !== favHighlight?.id);
  const showHighlights = !search.trim() && (favHighlight || recentHighlight);

  return (
    <Page className="bg-surface">
      <SectionHeader typeKey={typeKey} />

      <Page.Content className="px-[18px] pb-10 md:px-9">
        <div className="mt-4 flex items-center gap-3 md:mt-5">
          <SearchField
            aria-label={`Search ${type.group.toLowerCase()}`}
            className="w-full sm:w-80"
            onChange={onSearchChange}
            value={search}
            variant="secondary"
          >
            <SearchField.Group className="h-11 min-h-11 rounded-[11px] bg-surface-secondary">
              <SearchField.SearchIcon className="size-[15px] shrink-0 text-field-placeholder" />
              <SearchField.Input
                className="text-[13.5px]"
                placeholder={`Search ${type.group.toLowerCase()}`}
              />
              {count != null ? <span className="text-xs font-semibold text-muted">{count}</span> : null}
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="flex-1" />
          <ToggleButtonGroup
            aria-label="View"
            className="flex shrink-0 gap-0.5 rounded-[10px] bg-surface-secondary p-[3px]"
            isDetached
            onSelectionChange={(keys) => setView(([...keys][0] as 'tile' | 'list' | undefined) ?? 'tile')}
            selectedKeys={[view]}
            selectionMode="single"
            size="sm"
          >
            <ToggleButton
              aria-label="Tile view"
              className="h-7 w-8 min-h-0 min-w-0 rounded-[8px]! text-muted data-[selected=true]:bg-segment! data-[selected=true]:text-segment-foreground! data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              id="tile"
              isIconOnly
            >
              <LayoutGrid size={15} />
            </ToggleButton>
            <ToggleButton
              aria-label="List view"
              className="h-7 w-8 min-h-0 min-w-0 rounded-[8px]! text-muted data-[selected=true]:bg-segment! data-[selected=true]:text-segment-foreground! data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              id="list"
              isIconOnly
            >
              <List size={15} />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {filters ? <div className="mt-4">{filters}</div> : null}

        {showHighlights ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favHighlight ? (
              <HighlightCard
                item={favHighlight}
                onOpen={() => open(favHighlight)}
                kind="fav"
              />
            ) : null}
            {recentHighlight ? (
              <HighlightCard
                item={recentHighlight}
                onOpen={() => open(recentHighlight)}
                kind="recent"
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-5">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  className="h-[120px] animate-pulse rounded-[18px] bg-surface-secondary"
                  key={i}
                />
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-3 rounded-[18px] border border-separator p-4 text-sm text-muted">
              Couldn't load {type.group.toLowerCase()}
              <Button
                onPress={onRetry}
                size="sm"
                variant="secondary"
              >
                <RotateCcw size={14} />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            emptyState
          ) : (
            <>
              <div className={`grid gap-3 ${view === 'tile' ? 'sm:grid-cols-2' : ''}`}>
                {items.map((item) => (
                  <TemplateCard
                    isFav={isFav(favs, typeKey, item.id)}
                    item={item}
                    key={item.id}
                    onOpen={() => open(item)}
                    onToggleFav={() => toggleFav({id: item.id, name: item.name, type: typeKey})}
                    type={type}
                    {...menuActions(typeKey, item)}
                  />
                ))}
              </div>
              <div ref={sentinelRef} />
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
                  <Spinner size="sm" />
                  Loading more...
                </div>
              ) : null}
            </>
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
