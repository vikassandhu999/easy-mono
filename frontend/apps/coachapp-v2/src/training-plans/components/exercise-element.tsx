import {Button, Input, toast} from '@heroui/react';
import {ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, CopyPlus, Dumbbell, X} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {PlannedSet, WorkoutElement} from '@/api/trainingPlans';

import {useUpdateWorkoutElementMutation} from '@/api/trainingPlans';
import SetDetailEditor from '@/training-plans/components/set-detail-editor';
import SetSchemeInput, {
  buildPlannedSetsFromScheme,
  deriveSchemeFromSets,
  type SetSchemeValues,
} from '@/training-plans/components/set-scheme-input';

// ── Set scheme summary ──────────────────────────────────────────────

/** Format load for the one-line summary: "80kg", "BW", "RPE 8", etc. */
function formatLoadSummary(set: PlannedSet): string {
  if (!set.load_unit || set.load_unit === 'none') return '';
  if (set.load_unit === 'bodyweight') return 'BW';
  if (set.load_value == null) return '';
  if (set.load_unit === 'percent_1rm') return `${set.load_value}% 1RM`;
  if (set.load_unit === 'rpe') return `RPE ${set.load_value}`;
  return `${set.load_value}${set.load_unit}`;
}

/** Check if all sets have the same type, reps, load, load_unit, and rest */
function areSetsUniform(sets: PlannedSet[]): boolean {
  if (sets.length <= 1) return true;
  const first = sets[0]!;
  return sets.every(
    (s) =>
      s.set_type === first.set_type &&
      s.target_reps === first.target_reps &&
      s.load_value === first.load_value &&
      s.load_unit === first.load_unit &&
      s.rest_seconds === first.rest_seconds,
  );
}

/**
 * Build the one-line summary string for display in collapsed mode.
 *
 * Uniform:  "4 × 8-10 @ 80kg   120s"
 * Mixed:    "1×5w + 3 × 5 @ 140kg   180s"
 * Fallback: "5 sets (mixed)   120s"
 * Empty:    "No sets — tap to add"
 */
export function formatSetSchemeSummary(sets: PlannedSet[]): {rest: string; scheme: string} {
  if (sets.length === 0) return {scheme: 'No sets \u2014 tap to add', rest: ''};

  const first = sets[0]!;
  const rest = first.rest_seconds != null ? `${first.rest_seconds}s` : '';

  if (areSetsUniform(sets)) {
    const reps = first.target_reps ?? '\u2014';
    const load = formatLoadSummary(first);
    const loadPart = load ? ` @ ${load}` : '';
    return {scheme: `${sets.length} \u00d7 ${reps}${loadPart}`, rest};
  }

  // Try warmup + working pattern
  const warmups = sets.filter((s) => s.set_type === 'warmup');
  const working = sets.filter((s) => s.set_type === 'working');
  const workFirst = working[0];
  if (warmups.length + working.length === sets.length && workFirst && areSetsUniform(working)) {
    const workReps = workFirst.target_reps ?? '\u2014';
    const workLoad = formatLoadSummary(workFirst);
    const loadPart = workLoad ? ` @ ${workLoad}` : '';
    const workRest = workFirst.rest_seconds != null ? `${workFirst.rest_seconds}s` : '';
    return {
      scheme: `${warmups.length}\u00d7${warmups[0]?.target_reps ?? '?'}w + ${working.length} \u00d7 ${workReps}${loadPart}`,
      rest: workRest,
    };
  }

  // Fallback
  return {scheme: `${sets.length} sets (mixed)`, rest};
}

// ── Component ───────────────────────────────────────────────────────

type ExerciseElementProps = {
  element: WorkoutElement;
  /** Whether this element is currently expanded */
  isExpanded: boolean;
  /** Called when the coach taps Copy (parent shows workout selector) */
  onCopy?: () => void;
  /** Called when the coach taps Duplicate (same exercise + sets in same workout) */
  onDuplicate?: () => void;
  /** Called when the coach taps Move Down (swap with next element) */
  onMoveDown?: () => void;
  /** Called when the coach taps Move Up (swap with previous element) */
  onMoveUp?: () => void;
  /** Called when the coach taps Remove (parent handles undo toast) */
  onRemove: () => void;
  /** Called when the coach taps to expand/collapse */
  onToggleExpand: () => void;
  planId: string;
};

/**
 * A single exercise within a WorkoutSection.
 *
 * Two modes:
 * - **Collapsed** (default): One tappable line with set scheme summary + X remove
 * - **Expanded**: Exercise header + uniform SetSchemeInput or per-set SetDetailEditor
 *
 * Auto-detects editor mode: if all sets identical → uniform, otherwise → per-set.
 * Coach can toggle between modes.
 */
export default function ExerciseElement({
  element,
  isExpanded,
  onCopy,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
  onToggleExpand,
  planId,
}: ExerciseElementProps) {
  const [updateElement, {isLoading: isSaving}] = useUpdateWorkoutElementMutation();

  const exerciseName = element.exercise?.name ?? 'Unknown exercise';
  const mechanics = element.exercise?.mechanics;

  // Summary for collapsed view
  const summary = useMemo(() => formatSetSchemeSummary(element.planned_sets), [element.planned_sets]);

  // Detect if sets are uniform → determines default editor mode
  const setsAreUniform = useMemo(() => areSetsUniform(element.planned_sets), [element.planned_sets]);

  // Editor mode: 'uniform' (SetSchemeInput) or 'detail' (SetDetailEditor)
  const [editorMode, setEditorMode] = useState<'detail' | 'uniform'>(setsAreUniform ? 'uniform' : 'detail');

  // Local editing state — not persisted until Save
  const [localScheme, setLocalScheme] = useState<SetSchemeValues>(() => deriveSchemeFromSets(element.planned_sets));
  const [localSets, setLocalSets] = useState<PlannedSet[]>(() => [...element.planned_sets]);
  const [localNotes, setLocalNotes] = useState(element.notes ?? '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Bulk edit state (inline uniform editor without full expand)
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkScheme, setBulkScheme] = useState<SetSchemeValues>(() => deriveSchemeFromSets(element.planned_sets));

  // Reset local state when server data changes (e.g. after a save completes)
  const serverSetsKey = JSON.stringify(element.planned_sets);
  const serverNotesKey = element.notes ?? '';
  const [lastServerKey, setLastServerKey] = useState(serverSetsKey + serverNotesKey);
  const currentServerKey = serverSetsKey + serverNotesKey;
  if (currentServerKey !== lastServerKey) {
    setLastServerKey(currentServerKey);
    setLocalScheme(deriveSchemeFromSets(element.planned_sets));
    setLocalSets([...element.planned_sets]);
    setLocalNotes(element.notes ?? '');
    setHasUnsavedChanges(false);
    setEditorMode(areSetsUniform(element.planned_sets) ? 'uniform' : 'detail');
    setBulkScheme(deriveSchemeFromSets(element.planned_sets));
    setShowBulkEdit(false);
  }

  const handleSchemeChange = (values: SetSchemeValues) => {
    setLocalScheme(values);
    setHasUnsavedChanges(true);
  };

  const handleDetailChange = (sets: PlannedSet[]) => {
    setLocalSets(sets);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const sets = editorMode === 'uniform' ? buildPlannedSetsFromScheme(localScheme) : localSets;
    const trimmedNotes = localNotes.trim();
    try {
      await updateElement({
        id: element.id,
        planId,
        workoutId: element.workout_id,
        body: {planned_sets: sets, notes: trimmedNotes || null},
      }).unwrap();
      setHasUnsavedChanges(false);
    } catch {
      toast.danger('Failed to save');
    }
  };

  // Switch from uniform → detail: populate detail rows from scheme
  const switchToDetail = () => {
    setLocalSets(buildPlannedSetsFromScheme(localScheme));
    setEditorMode('detail');
  };

  // Switch from detail → uniform: only if all local sets are identical
  const canSwitchToUniform = areSetsUniform(localSets);
  const switchToUniform = () => {
    if (!canSwitchToUniform) return;
    setLocalScheme(deriveSchemeFromSets(localSets));
    setEditorMode('uniform');
  };

  // ── Bulk edit (inline uniform editor without full expand) ────────

  const handleBulkUpdate = async () => {
    const sets = buildPlannedSetsFromScheme(bulkScheme);
    try {
      await updateElement({
        id: element.id,
        planId,
        workoutId: element.workout_id,
        body: {planned_sets: sets},
      }).unwrap();
      setShowBulkEdit(false);
    } catch {
      toast.danger('Failed to update sets');
    }
  };

  // Check if working sets have per-set customizations (different values across working sets)
  const workingSets = element.planned_sets.filter((s) => s.set_type !== 'warmup');
  const hasCustomizedSets = workingSets.length > 1 && !areSetsUniform(workingSets);

  // ── Collapsed view ──────────────────────────────────────────────

  if (!isExpanded) {
    return (
      <div>
        <div className="flex min-h-11 items-center gap-1">
          <button
            aria-expanded={false}
            aria-label={`Edit ${exerciseName}`}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-content2 active:bg-content2"
            onClick={onToggleExpand}
            type="button"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm">{exerciseName}</span>
              {element.notes ? (
                <span className="block truncate text-xs text-foreground-400">{element.notes}</span>
              ) : null}
            </div>
          </button>
          <button
            aria-label="Quick edit sets"
            className="shrink-0 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-content2 active:bg-content2"
            onClick={() => {
              setBulkScheme(deriveSchemeFromSets(element.planned_sets));
              setShowBulkEdit((v) => !v);
            }}
            type="button"
          >
            <span className="text-xs text-foreground-500">{summary.scheme}</span>
            {summary.rest && <span className="ml-1.5 text-xs text-foreground-400">{summary.rest}</span>}
          </button>
          {onMoveUp && (
            <Button
              aria-label="Move up"
              isIconOnly
              onPress={onMoveUp}
              size="sm"
              variant="ghost"
            >
              <ArrowUp size={14} />
            </Button>
          )}
          {onMoveDown && (
            <Button
              aria-label="Move down"
              isIconOnly
              onPress={onMoveDown}
              size="sm"
              variant="ghost"
            >
              <ArrowDown size={14} />
            </Button>
          )}
          <Button
            aria-label={`Remove ${exerciseName}`}
            isIconOnly
            onPress={onRemove}
            size="sm"
            variant="ghost"
          >
            <X size={14} />
          </Button>
        </div>

        {/* Inline bulk editor */}
        {showBulkEdit && (
          <div className="mt-1 rounded-lg border border-dashed border-divider p-3">
            {hasCustomizedSets && (
              <p className="mb-2 text-xs text-warning">This will overwrite per-set customizations.</p>
            )}
            <SetSchemeInput
              onChange={setBulkScheme}
              values={bulkScheme}
            />
            <div className="mt-2 flex gap-2">
              <Button
                isPending={isSaving}
                onPress={handleBulkUpdate}
                size="sm"
              >
                Update all
              </Button>
              <Button
                onPress={onToggleExpand}
                size="sm"
                variant="ghost"
              >
                Per-set editor
              </Button>
              <Button
                onPress={() => setShowBulkEdit(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Expanded view ───────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-divider bg-content2 p-3">
      {/* Exercise header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Dumbbell
            className="shrink-0 text-foreground-400"
            size={14}
          />
          <p className="truncate text-sm font-medium">{exerciseName}</p>
          {mechanics && <span className="shrink-0 text-xs text-foreground-400">{mechanics}</span>}
        </div>
        <Button
          aria-label="Collapse"
          isIconOnly
          onPress={onToggleExpand}
          size="sm"
          variant="ghost"
        >
          <ChevronUp size={14} />
        </Button>
      </div>

      {/* Editor */}
      {editorMode === 'uniform' ? (
        <SetSchemeInput
          onChange={handleSchemeChange}
          showPresets
          values={localScheme}
        />
      ) : (
        <SetDetailEditor
          onChange={handleDetailChange}
          sets={localSets}
        />
      )}

      {/* Notes */}
      <div className="mt-3">
        <Input
          aria-label="Exercise notes"
          onChange={(e) => {
            setLocalNotes(e.target.value);
            setHasUnsavedChanges(true);
          }}
          placeholder="Notes (optional)"
          value={localNotes}
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          isPending={isSaving}
          onPress={handleSave}
          size="sm"
        >
          {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save *' : 'Save'}
        </Button>

        {/* Toggle editor mode */}
        {editorMode === 'uniform' ? (
          <Button
            onPress={switchToDetail}
            size="sm"
            variant="ghost"
          >
            Per-set editor
            <ChevronDown size={12} />
          </Button>
        ) : (
          <Button
            isDisabled={!canSwitchToUniform}
            onPress={switchToUniform}
            size="sm"
            variant="ghost"
          >
            Uniform editor
            <ChevronUp size={12} />
          </Button>
        )}

        {onCopy && (
          <Button
            onPress={onCopy}
            size="sm"
            variant="ghost"
          >
            <Copy size={12} />
            Copy
          </Button>
        )}

        {onDuplicate && (
          <Button
            onPress={onDuplicate}
            size="sm"
            variant="ghost"
          >
            <CopyPlus size={12} />
            Duplicate
          </Button>
        )}

        <Button
          className="ml-auto"
          onPress={onRemove}
          size="sm"
          variant="ghost"
        >
          <X size={12} />
          Remove
        </Button>
      </div>

      {/* Unsaved indicator */}
      {hasUnsavedChanges && <p className="mt-1 text-xs text-warning">Unsaved changes</p>}
    </div>
  );
}
