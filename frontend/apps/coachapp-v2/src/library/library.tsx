import {Button, Dropdown, Header, Label, SearchField, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {ChevronRight, Clock, Plus, RotateCcw} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useListFormTemplatesQuery} from '@/api/checkins';
import {useListCoachExercisesQuery, useListFoodsQuery, useListRecipesQuery} from '@/api/generated';
import {useListNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useListTrainingPlansQuery} from '@/api/training-plans-list';
import TemplateCard from '@/library/components/template-card';
import TemplatePreview, {type PreviewTarget} from '@/library/components/template-preview';
import {
  type BuilderItem,
  exerciseItem,
  foodItem,
  formTemplateItem,
  nutritionPlanItem,
  recipeItem,
  trainingPlanItem,
} from '@/library/lib/builder-items';
import {BUILDER_TYPES, type BuilderType, type BuilderTypeKey} from '@/library/lib/builder-types';
import {isFav, pushRecent, toggleFav, useFavs, useRecents} from '@/library/lib/recents';
import {useBuilderMenuActions} from '@/library/lib/use-menu-actions';

// Server-side search exists for training/exercises/recipes/foods; nutrition
// plans and form templates are filtered client-side from one fetch.
// ponytail: 50 covers realistic plan libraries; paginate if someone outgrows it.
const NUTRITION_FETCH_LIMIT = 50;
const GROUP_LIMIT = 4;
const FOCUSED_LIMIT = 24;

interface GroupData {
  isError: boolean;
  isLoading: boolean;
  items: BuilderItem[];
  refetch: () => void;
  total: number;
}

function matches(q: string) {
  const needle = q.toLowerCase();
  return (item: BuilderItem) => !needle || item.name.toLowerCase().includes(needle);
}

export default function Library() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<'all' | BuilderTypeKey>('all');
  const q = useDeferredValue(search).trim();
  const recents = useRecents();
  const favs = useFavs();

  const limitFor = (key: BuilderTypeKey) => (cat === key ? FOCUSED_LIMIT : GROUP_LIMIT);
  const searchArg = q ? {search: q} : {};

  const training = useListTrainingPlansQuery({limit: limitFor('training'), ...searchArg});
  const nutrition = useListNutritionPlansQuery({limit: NUTRITION_FETCH_LIMIT});
  const forms = useListFormTemplatesQuery();
  const exercises = useListCoachExercisesQuery({limit: limitFor('exercises'), ...searchArg});
  const recipes = useListRecipesQuery({limit: limitFor('recipes'), ...searchArg});
  const foods = useListFoodsQuery({limit: limitFor('foods'), ...searchArg});

  const menuActions = useBuilderMenuActions();

  const clientFiltered = (all: BuilderItem[], key: BuilderTypeKey) => {
    const filtered = all.filter(matches(q));
    return {items: filtered.slice(0, limitFor(key)), total: filtered.length};
  };

  const groups: Record<BuilderTypeKey, GroupData> = {
    exercises: {
      isError: exercises.isError,
      isLoading: exercises.isLoading,
      items: (exercises.data?.data ?? []).map(exerciseItem),
      refetch: exercises.refetch,
      total: exercises.data?.count ?? 0,
    },
    foods: {
      isError: foods.isError,
      isLoading: foods.isLoading,
      items: (foods.data?.data ?? []).map(foodItem),
      refetch: foods.refetch,
      total: foods.data?.count ?? 0,
    },
    forms: {
      isError: forms.isError,
      isLoading: forms.isLoading,
      refetch: forms.refetch,
      ...clientFiltered((forms.data?.data ?? []).map(formTemplateItem), 'forms'),
    },
    nutrition: {
      isError: nutrition.isError,
      isLoading: nutrition.isLoading,
      refetch: nutrition.refetch,
      ...clientFiltered((nutrition.data?.data ?? []).map(nutritionPlanItem), 'nutrition'),
    },
    recipes: {
      isError: recipes.isError,
      isLoading: recipes.isLoading,
      items: (recipes.data?.data ?? []).map(recipeItem),
      refetch: recipes.refetch,
      total: recipes.data?.count ?? 0,
    },
    training: {
      isError: training.isError,
      isLoading: training.isLoading,
      items: (training.data?.data ?? []).map(trainingPlanItem),
      refetch: training.refetch,
      total: training.data?.count ?? 0,
    },
  };

  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const openItem = (type: BuilderType, item: Pick<BuilderItem, 'id' | 'name'>) => {
    pushRecent({id: item.id, name: item.name, type: type.key});
    setPreview({id: item.id, name: item.name, type: type.key});
  };

  const visibleTypes = cat === 'all' ? BUILDER_TYPES : BUILDER_TYPES.filter((t) => t.key === cat);
  const anyLoading = visibleTypes.some((t) => groups[t.key].isLoading);
  // Exercises and Foods include the system databases — not coach templates.
  const totalTemplates = (['training', 'nutrition', 'forms', 'recipes'] as const).reduce(
    (sum, k) => sum + groups[k].total,
    0,
  );
  const allEmpty = !anyLoading && visibleTypes.every((t) => groups[t.key].items.length === 0 && !groups[t.key].isError);
  const showRecent = !q && cat === 'all' && recents.length > 0;

  return (
    <Page className="bg-surface">
      <Page.Header className="items-end gap-6 px-[18px] pt-2 pb-0! md:px-9 md:pt-[34px]">
        <Page.TitleGroup>
          <Page.Title className="font-grotesk text-[27px]! leading-none! font-bold! tracking-[-0.035em]! md:text-[32px]!">
            Builder
          </Page.Title>
          <Page.Description className="mt-2.5 text-xs leading-[21px] md:text-[13.5px]">
            <span className="font-semibold text-foreground">{anyLoading ? '…' : totalTemplates}</span> templates
          </Page.Description>
        </Page.TitleGroup>
        <Page.Actions>
          <Dropdown>
            <Button
              aria-label="Build new"
              className="h-11 min-h-11 rounded-[11px]! px-0 text-[13.5px] shadow-[0_6px_16px_-6px_rgba(24,24,27,0.5)] md:px-[17px]!"
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
            <Dropdown.Popover className="min-w-[238px] rounded-[16px]">
              <Dropdown.Menu onAction={(key) => navigate(BUILDER_TYPES.find((t) => t.key === key)?.createRoute ?? '')}>
                <Dropdown.Section>
                  <Header>Create new</Header>
                  {BUILDER_TYPES.map((t) => (
                    <Dropdown.Item
                      id={t.key}
                      key={t.key}
                      textValue={t.label}
                    >
                      <span className="flex size-[26px] items-center justify-center rounded-[8px] bg-surface-secondary">
                        <t.icon
                          size={15}
                          strokeWidth={2}
                        />
                      </span>
                      <Label>{t.label}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Page.Actions>
      </Page.Header>

      <Page.Content className="px-[18px] pb-10 md:px-9">
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-[22px]">
          <SearchField
            aria-label="Search the library"
            className="w-full sm:w-72 sm:shrink-0"
            onChange={setSearch}
            value={search}
            variant="secondary"
          >
            <SearchField.Group className="h-11 min-h-11 rounded-[11px] bg-surface-secondary">
              <SearchField.SearchIcon className="size-[15px] shrink-0 text-field-placeholder" />
              <SearchField.Input
                className="text-[13.5px]"
                placeholder="Search the library"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="hidden flex-1 sm:block" />
          <ToggleButtonGroup
            aria-label="Filter by type"
            className="flex max-w-full gap-0.5 self-start overflow-x-auto rounded-[10px] bg-surface-secondary p-[3px] sm:self-auto"
            isDetached
            onSelectionChange={(keys) => setCat(([...keys][0] as typeof cat | undefined) ?? 'all')}
            selectedKeys={[cat]}
            selectionMode="single"
            size="sm"
          >
            {[
              ['all', 'All'],
              ['training', 'Training'],
              ['nutrition', 'Nutrition'],
              ['forms', 'Forms'],
              ['exercises', 'Exercises'],
              ['recipes', 'Recipes'],
              ['foods', 'Foods'],
            ].map(([id, label]) => (
              <ToggleButton
                className="h-8 min-h-0 whitespace-nowrap rounded-[8px]! px-3.5 text-[12.5px] font-semibold text-muted data-[selected=true]:bg-segment! data-[selected=true]:text-segment-foreground! data-[selected=true]:shadow-[0_1px_3px_rgba(24,24,27,0.16)]"
                id={id}
                key={id}
              >
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        {showRecent ? (
          <div className="mt-6 md:mt-[26px]">
            <div className="mb-3.5 flex items-center gap-2">
              <Clock
                size={15}
                strokeWidth={2}
              />
              <span className="font-grotesk text-xs font-bold uppercase tracking-[0.08em]">Recently opened</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1.5">
              {recents.map((r) => {
                const type = BUILDER_TYPES.find((t) => t.key === r.type);
                if (!type) {
                  return null;
                }
                return (
                  <button
                    className="w-[184px] shrink-0 rounded-[16px] border border-separator bg-surface px-4 py-[15px] text-left transition-all hover:-translate-y-0.5 hover:border-edge hover:shadow-[0_18px_36px_-20px_rgba(24,24,27,0.4)]"
                    key={`${r.type}:${r.id}`}
                    onClick={() => openItem(type, r)}
                    type="button"
                  >
                    <span className={`flex size-10 items-center justify-center rounded-[12px] ${type.bg}`}>
                      <type.icon
                        className={type.fg}
                        size={20}
                        strokeWidth={1.9}
                      />
                    </span>
                    <div className="mt-3 truncate font-grotesk text-[14.5px] font-bold tracking-[-0.01em]">
                      {r.name}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-muted">{type.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-[30px] md:mt-[26px]">
          {visibleTypes.map((type) => {
            const group = groups[type.key];
            if (!group.isLoading && !group.isError && group.items.length === 0) {
              return null;
            }
            return (
              <section key={type.key}>
                <button
                  className="-ml-1.5 mb-3.5 flex items-center gap-2 rounded-[9px] py-[5px] pr-2.5 pl-1.5 transition-all hover:translate-x-0.5 hover:bg-surface-secondary"
                  onClick={() => navigate(type.listRoute)}
                  title="Open section"
                  type="button"
                >
                  <span className="font-grotesk text-xs font-bold uppercase tracking-[0.08em]">{type.group}</span>
                  <span className="text-xs font-semibold text-muted/80">{group.isLoading ? '' : group.total}</span>
                  <ChevronRight
                    className="text-link opacity-55"
                    size={14}
                    strokeWidth={2.4}
                  />
                </button>
                {group.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-[120px] animate-pulse rounded-[18px] bg-surface-secondary" />
                    <div className="h-[120px] animate-pulse rounded-[18px] bg-surface-secondary" />
                  </div>
                ) : group.isError ? (
                  <div className="flex items-center gap-3 rounded-[18px] border border-separator p-4 text-sm text-muted">
                    Couldn't load {type.group.toLowerCase()}
                    <Button
                      onPress={group.refetch}
                      size="sm"
                      variant="secondary"
                    >
                      <RotateCcw size={14} />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <TemplateCard
                        isFav={isFav(favs, type.key, item.id)}
                        item={item}
                        key={item.id}
                        onOpen={() => openItem(type, item)}
                        onToggleFav={() => toggleFav({id: item.id, name: item.name, type: type.key})}
                        type={type}
                        {...menuActions(type.key, item)}
                      />
                    ))}
                    {group.total > group.items.length ? (
                      <button
                        className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-edge bg-surface-secondary/30 transition-all hover:-translate-y-0.5 hover:border-link hover:shadow-[0_18px_36px_-20px_rgba(24,24,27,0.35)] dark:bg-surface-secondary/40"
                        onClick={() => navigate(type.listRoute)}
                        type="button"
                      >
                        <span className="flex size-[34px] items-center justify-center rounded-full bg-link-soft">
                          <ChevronRight
                            className="text-link"
                            size={17}
                            strokeWidth={2.4}
                          />
                        </span>
                        <span className="text-[13px] font-semibold text-link">See all {group.total}</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}

          {allEmpty ? (
            <div className="py-16 text-center">
              <div className="text-[15px] font-semibold text-muted">Nothing here yet</div>
              <div className="mt-1.5 text-[13px] text-muted/80">
                Try a different search or filter — or create a new template.
              </div>
            </div>
          ) : null}
        </div>

        <TemplatePreview
          onClose={() => setPreview(null)}
          target={preview}
        />
      </Page.Content>
    </Page>
  );
}
