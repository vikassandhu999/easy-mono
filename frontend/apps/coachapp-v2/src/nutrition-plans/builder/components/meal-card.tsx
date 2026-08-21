/**
 * MealCard — one meal on the active day of the nutrition plan builder.
 *
 * Collapsed header (redesign): slot tag (opens the slot menu) · meal name ·
 * `Used in {n} places` when the meal is shared across days · `+{n} swap` when
 * the meal has alternates · kcal · ⋯ menu · expand chevron.
 * Expanded body: item rows, `+ Add food or recipe`, then the
 * `Client can swap with` list and `+ Add a swap`.
 *
 * The card is a `Disclosure` (UI-CONTRACT §2 / AGENTS.md — the app has no
 * Accordion). Two triggers are used so the ⋯ menu can sit between the meal's
 * figures and the chevron the way the reference does; the slot tag and the ⋯
 * menu are siblings of the trigger, never nested inside it (no button-in-button).
 *
 * Data model note: the "meal" is a plan-level entity and the day holds an
 * ordered slot option per meal, so this component takes both — `meal` for the
 * content and `optionId` for the day assignment it is rendered under. Swaps are
 * the non-default options in the same slot. Every write goes through
 * `commands`; the card renders what it is given and never touches the cache.
 * The add-items flow and the edit-mode amount sheet are mounted ONCE at the
 * composition root — this card only reports intent (`onAddItems`, `onEditItem`).
 */
import {Button, Chip, Disclosure, Dropdown, Label, Separator} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ArrowLeftRight, ChevronDown, ChevronUp, Info, MoreHorizontal, TrashIcon, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AS_ICON_BUTTON, AS_TEXT, NO_GAP} from '@/@components/ua-defaults';
import type {NutritionMeal} from '@/api/nutrition-plan-builder';
import {INLINE_LINK, TAG} from '@/builder-kit/ui';

import {kcalLabel} from '../macros';
import type {PlanBuilderCommands} from '../use-plan-builder';
import type {BuilderMealSlot} from '../slots';
import type {HydratedMealItem} from './meal-item-row';
import {MealItemRow} from './meal-item-row';
import type {MealPaletteOption} from './meal-palette';
import {AddSwapControl} from './meal-palette';
import {MealSlotControl} from './meal-slot-control';

const ICON_BUTTON = `shrink-0 rounded-chip bg-transparent text-muted sm:size-7 ${AS_ICON_BUTTON}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealSwap {
  /** The day-meal option id — removing a swap removes this option. */
  optionId: string;
  meal: NutritionMeal;
}

interface MealCardProps {
  meal: NutritionMeal;
  commands: PlanBuilderCommands;
  /** The day this card is rendered under, and the slot option binding it there. */
  dayId: string;
  optionId: string;
  open: boolean;
  onToggle: () => void;
  /** Meal slot this meal occupies on the active day. */
  slot: BuilderMealSlot;
  /** How many day-slot options across the plan point at this meal. */
  assignmentCount: number;
  swaps: MealSwap[];
  swapCandidates: MealPaletteOption[];
  /** Opens the root-mounted add-items flow for this meal. */
  onAddItems: () => void;
  /** Opens the root-mounted amount sheet on this item, anchored to the tapped row. */
  onEditItem: (item: HydratedMealItem, anchor: HTMLElement) => void;
  /** Menu-order ▲▼ — omitted while the card is bound to a Day Pattern slot. */
  onMove?: (direction: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Newly created meals open straight into rename mode (INTERACTIONS.md § NB). */
  autoRename?: boolean;
  /** Style-diff anchors (manifests/NB.json) — one card per variant carries them. */
  cardTestId?: string;
  triggerTestId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MealCard({
  meal,
  commands,
  dayId,
  optionId,
  open,
  onToggle,
  slot,
  assignmentCount,
  swaps,
  swapCandidates,
  onAddItems,
  onEditItem,
  onMove,
  isFirst,
  isLast,
  autoRename,
  cardTestId,
  triggerTestId,
}: MealCardProps) {
  // Inline rename state
  const [editingName, setEditingName] = useState(Boolean(autoRename));
  const [nameValue, setNameValue] = useState(meal.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep local name in sync if the server value changes (e.g. refetch)
  useEffect(() => {
    if (!editingName) {
      setNameValue(meal.name);
    }
  }, [meal.name, editingName]);

  // ---------------------------------------------------------------------------
  // Rename handlers
  // ---------------------------------------------------------------------------

  const startEditing = useCallback(() => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === meal.name) {
      setEditingName(false);
      setNameValue(meal.name);
      return;
    }
    setEditingName(false);
    const ok = await commands.renameMeal(meal.id, trimmed);
    if (!ok) {
      setNameValue(meal.name);
    }
  }, [commands, nameValue, meal.id, meal.name]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename().catch(() => undefined);
      } else if (e.key === 'Escape') {
        setEditingName(false);
        setNameValue(meal.name);
      }
    },
    [commitRename, meal.name],
  );

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  // Collapsed Disclosure bodies still render, so body-level style-diff anchors
  // (manifests/NB.json) are only tagged on the card that is actually open.
  const openId = (id: string) => (open ? id : undefined);

  const items = [...meal.meal_items].sort((a, b) => a.position - b.position) as HydratedMealItem[];
  const kcal = kcalLabel(meal.nutrients);
  const isShared = assignmentCount >= 2;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Disclosure
      className={cn(
        // Surface is the `disclosure--builder` theme rule, shared with the
        // training builder's exercise card. Only the border COLOUR is this
        // screen's: open wins over shared, because the prototype tints the
        // border amber only while the card is collapsed.
        'disclosure--builder',
        open ? 'border-meal-open' : isShared ? 'border-shared-foreground' : 'border-border',
      )}
      data-testid={cardTestId}
      isExpanded={open}
      onExpandedChange={onToggle}
    >
      {/* Header row — the slot tag and the ⋯ menu are siblings of the triggers
          so no interactive control is nested inside a button. Below `sm` the
          name takes its own line (`order-last w-full`) so it never truncates
          away next to the slot tag and the figures. */}
      <div
        className="flex flex-wrap items-center gap-3 px-3 py-3"
        data-testid="nb-card-header"
      >
        <div className="flex-1 shrink-0 sm:flex-none">
          <MealSlotControl
            onChange={(nextSlot) => {
              if (nextSlot !== slot) {
                commands.changeSlot(dayId, optionId, nextSlot).catch(() => undefined);
              }
            }}
            slot={slot}
          />
        </div>

        {editingName ? (
          <input
            ref={nameInputRef}
            // biome-ignore lint/a11y/noAutofocus: name field opens in editing mode on user intent
            autoFocus
            aria-label="Meal name"
            className="order-last w-full min-w-0 border-b border-accent bg-transparent type-body font-semibold text-foreground outline-none sm:order-none sm:w-auto sm:flex-1"
            onBlur={() => {
              commitRename().catch(() => undefined);
            }}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={handleNameKeyDown}
            value={nameValue}
          />
        ) : (
          <Disclosure.Heading className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
            <Disclosure.Trigger
              className="flex w-full items-center gap-3 text-left"
              data-testid={triggerTestId}
            >
              <span
                className="min-w-0 flex-1 truncate type-body font-semibold text-foreground"
                data-testid="nb-meal-name"
              >
                {meal.name}
              </span>
              {isShared ? (
                <Chip
                  className={`${TAG} ${NO_GAP} border-shared-foreground bg-transparent text-shared-foreground`}
                  data-testid="nb-shared-chip"
                  size="sm"
                >
                  Used in {assignmentCount} places
                </Chip>
              ) : null}
              {swaps.length > 0 ? (
                <Chip
                  className={`${TAG} ${NO_GAP} text-muted`}
                  data-testid="nb-swap-chip"
                  size="sm"
                >
                  +{swaps.length} swap{swaps.length === 1 ? '' : 's'}
                </Chip>
              ) : null}
              {kcal ? (
                <span
                  className="shrink-0 whitespace-nowrap type-eyebrow text-muted"
                  data-testid="nb-meal-kcal"
                >
                  {kcal}
                </span>
              ) : null}
            </Disclosure.Trigger>
          </Disclosure.Heading>
        )}

        {onMove ? (
          <div className="flex shrink-0 items-center">
            <Button
              aria-label={`Move ${meal.name} up`}
              className={ICON_BUTTON}
              isDisabled={isFirst}
              isIconOnly
              onPress={() => onMove(-1)}
              size="sm"
              variant="ghost"
            >
              <ChevronUp />
            </Button>
            <Button
              aria-label={`Move ${meal.name} down`}
              className={ICON_BUTTON}
              isDisabled={isLast}
              isIconOnly
              onPress={() => onMove(1)}
              size="sm"
              variant="ghost"
            >
              <ChevronDown />
            </Button>
          </div>
        ) : null}

        <Dropdown>
          <Button
            aria-label={`Meal options for ${meal.name}`}
            className={`  shrink-0 rounded-chip bg-transparent text-muted  sm:size-7   ${AS_ICON_BUTTON}`}
            data-testid="nb-meal-menu-btn"
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
          <Dropdown.Popover>
            {/* Drive selection via the menu so it fires on pointer AND keyboard
                activation — RAC routes Enter/Space through onAction, not the
                item's onPress (same pattern as plan-actions.tsx). */}
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'rename-meal') {
                  startEditing();
                } else if (key === 'remove-from-day') {
                  commands.removeOption(dayId, optionId).catch(() => undefined);
                } else if (key === 'delete-meal') {
                  commands.removeMeal(meal.id).catch(() => undefined);
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item
                  id="rename-meal"
                  textValue="Rename meal"
                >
                  <Label>Rename meal</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id="remove-from-day"
                  textValue="Remove from this day"
                >
                  <Label>Remove from this day</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator />
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete-meal"
                  textValue="Delete meal"
                  variant="danger"
                >
                  <div className="flex items-center gap-2">
                    <TrashIcon className="shrink-0 text-danger" />
                    <Label>Delete meal</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Disclosure.Trigger
          aria-label={open ? `Collapse ${meal.name}` : `Expand ${meal.name}`}
          className="flex shrink-0 items-center justify-center text-muted"
        >
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </div>

      <Disclosure.Content>
        {/* A plain div, not Disclosure.Body: `.disclosure__body` is unlayered,
            so its padding wins over any utility we put on the component. */}
        <div
          className="border-t border-border pt-1.5 pr-4 pb-3 pl-4 sm:pl-10"
          data-testid={openId('nb-body')}
        >
          {isShared ? (
            <div
              className="flex items-center gap-2 pt-2 pb-0.5 type-eyebrow text-shared-foreground"
              data-testid={openId('nb-shared-note')}
            >
              <Info className="size-3.5 flex-none" />
              This meal is on {assignmentCount} days — edits apply everywhere.
            </div>
          ) : null}

          {items.length === 0 ? (
            <div
              className="py-2 type-eyebrow text-muted"
              data-testid={openId('nb-meal-empty')}
            >
              No foods yet — add the first one below.
            </div>
          ) : (
            items.map((item, index) => (
              <MealItemRow
                key={item.id}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                showTestIds={open}
                item={item}
                onMove={(direction) => {
                  commands.moveItem(meal.id, index, index + direction).catch(() => undefined);
                }}
                onRemove={() => {
                  commands.removeItem(meal.id, item.id).catch(() => undefined);
                }}
                onTap={(anchor) => onEditItem(item, anchor)}
              />
            ))
          )}

          <div className="pt-2">
            <Button
              className={`${INLINE_LINK} type-eyebrow`}
              data-testid={openId('nb-add-food')}
              onPress={onAddItems}
              size="sm"
              variant="ghost"
            >
              + Add food or recipe
            </Button>
          </div>

          {/* Swaps — the meal itself is the default, so this lists alternates only. */}
          <div
            className="mt-3 border-t border-dashed border-border pt-3"
            data-testid={openId('nb-swaps-section')}
          >
            <div
              className="mb-2 type-eyebrow font-semibold uppercase tracking-eyebrow text-muted"
              data-testid={openId('nb-swaps-label')}
            >
              Client can swap with
            </div>

            <div className="flex flex-col gap-1.5">
              {swaps.map((swap, index) => {
                const optionIndex = index + 1;
                return (
                  <div
                    className="flex min-h-11 items-center gap-2 rounded-control border border-border px-3 py-2 sm:min-h-0"
                    data-testid={openId('nb-swap-row')}
                    key={swap.optionId}
                  >
                    <ArrowLeftRight className="size-3.5 shrink-0 text-muted" />
                    <span
                      className="min-w-0 flex-1 truncate type-eyebrow text-foreground"
                      data-testid={openId('nb-swap-name')}
                    >
                      {swap.meal.name}
                    </span>
                    {kcalLabel(swap.meal.nutrients) ? (
                      <span
                        className="shrink-0 whitespace-nowrap type-eyebrow text-muted"
                        data-testid={openId('nb-swap-kcal')}
                      >
                        {kcalLabel(swap.meal.nutrients)}
                      </span>
                    ) : null}
                    <Button
                      aria-label={`Move swap ${swap.meal.name} up`}
                      className={`shrink-0 rounded-chip bg-transparent p-0 text-muted sm:size-5.5 ${AS_TEXT} ${NO_GAP}`}
                      data-testid={openId('nb-swap-move-up')}
                      isIconOnly
                      onPress={() => {
                        commands.moveOption(dayId, slot, optionIndex, optionIndex - 1).catch(() => undefined);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      aria-label={`Move swap ${swap.meal.name} down`}
                      className={`shrink-0 rounded-chip bg-transparent p-0 text-muted sm:size-5.5 ${AS_TEXT} ${NO_GAP}`}
                      data-testid={openId('nb-swap-move-down')}
                      isDisabled={index === swaps.length - 1}
                      isIconOnly
                      onPress={() => {
                        commands.moveOption(dayId, slot, optionIndex, optionIndex + 1).catch(() => undefined);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button
                      aria-label={`Remove swap ${swap.meal.name}`}
                      className={`  shrink-0 rounded-chip bg-transparent p-0 text-muted  sm:size-5.5   ${AS_TEXT} ${NO_GAP}`}
                      data-testid={openId('nb-swap-remove')}
                      isIconOnly
                      onPress={() => {
                        commands.removeOption(dayId, swap.optionId).catch(() => undefined);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-2">
              <AddSwapControl
                onAdd={(mealId) => {
                  commands.addOption(dayId, slot, mealId).catch(() => undefined);
                }}
                options={swapCandidates}
                testId={openId('nb-add-swap')}
              />
            </div>
          </div>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
}
