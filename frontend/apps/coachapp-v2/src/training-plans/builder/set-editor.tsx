/**
 * The set value editor (badge TB) — a `ResponsiveOverlay`, so it is an anchored
 * popover on desktop and a keyboard-docked sheet on mobile.
 *
 * There is no draft object and no save button: every control writes straight
 * through `onChange`, and the set writer decides when to send. Which fields
 * appear is `tracking.ts`'s answer; each one is a descriptor in `FIELDS`.
 */
import {
  Button,
  Disclosure,
  ErrorMessage,
  Input,
  Label,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {type ReactNode, type RefObject, useState} from 'react';

import type {TrainingPlanWorkoutExercise} from '@/api/training-plan-builder';
import {
  DISTANCE_UNIT_LABELS,
  LOAD_UNIT_LABELS,
  type PlannedSet,
  parseRpe,
  parseWholeNumber,
  SET_TYPE_LABELS,
} from '@/training-plans/builder/sets';
import {type FieldKey, fieldsFor} from '@/training-plans/builder/tracking';
import {UNIT_CHIP} from '@/ui/builder-tokens';
import {ResponsiveOverlay} from '@/ui/responsive-overlay';

type LoadUnit = NonNullable<PlannedSet['load_unit']>;
type DistanceUnit = NonNullable<PlannedSet['distance_unit']>;
type SetType = NonNullable<PlannedSet['set_type']>;

// Options come from the vocabulary tables in sets.ts, so the editor's chips
// can never drift from the summary line's labels.
// `Object.entries` widens a Record's keys to `string`; the table is total over V,
// so the entries really are `[V, string]`.
const toOptions = <V extends string>(labels: Record<V, string>): Option<V>[] =>
  (Object.entries(labels) as [V, string][]).map(([value, label]) => ({label, value}));

const SET_TYPES: Option<SetType>[] = toOptions(SET_TYPE_LABELS);
const LOAD_UNITS: Option<LoadUnit>[] = toOptions<Exclude<LoadUnit, 'none'>>(LOAD_UNIT_LABELS);
const DISTANCE_UNITS: Option<DistanceUnit>[] = toOptions(DISTANCE_UNIT_LABELS);

// min-w-0 is load-bearing: TextField is w-full, so without it the first field
// claims its intrinsic width and pushes the rest out of the popover.
const BOX_CLASS = 'min-w-0 flex-1 rounded-control border border-border bg-surface px-2 pt-1.5 pb-2 text-center';
const LABEL_CLASS = 'mb-1 block type-eyebrow uppercase tracking-wider text-muted';
const BOX_INPUT_CLASS =
  'h-auto border-0 bg-transparent px-0 text-center type-heading font-semibold text-foreground shadow-none';

// ---------------------------------------------------------------------------
// Field descriptors — one row per editable measure
// ---------------------------------------------------------------------------

type Patch = Partial<PlannedSet>;

interface FieldUi {
  label: string;
  /** `inputMode` for the soft keyboard; the multiline notes field has none. */
  mode?: 'decimal' | 'numeric';
  /** The text to show for this set. */
  read: (set: PlannedSet) => string;
  /** The patch to save, or `undefined` while the text isn't saveable yet. */
  write: (text: string) => Patch | undefined;
  /** Numeric drafts commit on blur so an invalid final value cannot save a valid prefix. */
  commitOnBlur?: boolean;
  invalidMessage?: string;
  /** Unit chips under the value, for the measures that carry a unit. */
  units?: (set: PlannedSet, onChange: (patch: Patch) => void) => ReactNode;
  multiline?: boolean;
  placeholder?: string;
}

/** A column the API stores as a string — the text goes straight through. */
function textColumn(column: 'distance_value' | 'load_value' | 'notes' | 'reps') {
  return {
    read: (set: PlannedSet) => set[column] ?? '',
    write: (text: string): Patch => ({[column]: text || null}),
  };
}

/** A column the API stores as a number — blank saves null, garbage saves nothing. */
function numberColumn(
  column: 'duration_seconds' | 'rest_seconds' | 'rpe',
  parse: (text: string) => number | null | undefined,
) {
  return {
    // `rpe` arrives as a string despite its type, so stringify rather than trust it.
    read: (set: PlannedSet) => (set[column] == null ? '' : String(set[column])),
    write: (text: string): Patch | undefined => {
      const value = parse(text);
      return value === undefined ? undefined : {[column]: value};
    },
    commitOnBlur: true,
  };
}

const FIELDS: Record<FieldKey, FieldUi> = {
  reps: {label: 'Reps', mode: 'numeric', ...textColumn('reps')},
  load: {
    label: 'Weight',
    mode: 'decimal',
    ...textColumn('load_value'),
    units: (set, onChange) => (
      <SingleToggle
        buttonClassName={UNIT_CHIP}
        className="mt-1.5 flex justify-center gap-1.5"
        label="Weight unit"
        onChange={(unit) => onChange({load_unit: unit})}
        options={LOAD_UNITS}
        value={set.load_unit ?? 'kg'}
      />
    ),
  },
  rpe: {label: 'RPE', mode: 'decimal', invalidMessage: 'Use 1 to 10', ...numberColumn('rpe', parseRpe)},
  duration: {
    label: 'Secs',
    mode: 'numeric',
    invalidMessage: 'Use a whole number',
    ...numberColumn('duration_seconds', parseWholeNumber),
  },
  distance: {
    label: 'Dist',
    mode: 'decimal',
    ...textColumn('distance_value'),
    units: (set, onChange) => (
      <SingleToggle
        buttonClassName={UNIT_CHIP}
        className="mt-1.5 flex justify-center gap-1.5"
        label="Distance unit"
        onChange={(unit) => onChange({distance_unit: unit})}
        options={DISTANCE_UNITS}
        // A stored `none` (or null) reads as meters, matching the row summary.
        value={set.distance_unit === 'km' || set.distance_unit === 'miles' ? set.distance_unit : 'meters'}
      />
    ),
  },
};

/** The two behind "Rest timer and notes". */
const REST: FieldUi = {
  label: 'Rest (seconds)',
  mode: 'numeric',
  placeholder: '90',
  invalidMessage: 'Use a whole number',
  ...numberColumn('rest_seconds', parseWholeNumber),
};

const NOTES: FieldUi = {
  label: 'Notes',
  multiline: true,
  placeholder: 'Tempo, cues, %1RM targets…',
  ...textColumn('notes'),
};

// ---------------------------------------------------------------------------

interface SetEditorProps {
  element: TrainingPlanWorkoutExercise;
  setIndex: number;
  /** The row (or `+ Add set` button) the desktop popover anchors to. */
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onChange: (patch: Patch) => void;
}

export function SetEditor({element, setIndex, anchorRef, isOpen, onClose, onSelectIndex, onChange}: SetEditorProps) {
  const set = element.planned_sets[setIndex];
  const total = element.planned_sets.length;

  return (
    <ResponsiveOverlay
      closeLabel="Done"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={element.exercise?.name ?? 'Exercise'}
      triggerRef={anchorRef}
    >
      {set ? (
        <div className="w-full">
          {/* Prev/Next move between sets without closing (spec — replaces swipe). */}
          <div className="mb-3 flex items-center justify-center gap-4">
            <Button
              aria-label="Previous set"
              className="size-11 text-muted"
              isDisabled={setIndex === 0}
              isIconOnly
              onPress={() => onSelectIndex(setIndex - 1)}
              variant="ghost"
            >
              <ChevronLeft />
            </Button>
            <Typography
              color="muted"
              type="body-xs"
              weight="medium"
            >
              Set {setIndex + 1} of {total}
            </Typography>
            <Button
              aria-label="Next set"
              className="size-11 text-muted"
              isDisabled={setIndex >= total - 1}
              isIconOnly
              onPress={() => onSelectIndex(setIndex + 1)}
              variant="ghost"
            >
              <ChevronRight />
            </Button>
          </div>

          <SingleToggle
            className="segmented mb-3"
            label="Set type"
            onChange={(next) => onChange({set_type: next})}
            options={SET_TYPES}
            value={set.set_type ?? 'working'}
          />

          <div className="mb-3 flex gap-2">
            {fieldsFor(element.exercise?.tracking_type ?? null).map((key) => (
              <BoxField
                // The typed text is buffered per field, so a change of set has to
                // remount them — that is what the index in the key is for.
                key={`${key}-${setIndex}`}
                field={FIELDS[key]}
                onChange={onChange}
                set={set}
              />
            ))}
          </div>

          <Disclosure>
            <Disclosure.Heading>
              <Disclosure.Trigger className="flex items-center gap-1 type-body font-medium text-accent">
                <Disclosure.Indicator />
                Rest timer and notes
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className="flex flex-col gap-2 px-0 pb-0">
                <PlainField
                  key={`rest-${setIndex}`}
                  field={REST}
                  onChange={onChange}
                  set={set}
                />
                <PlainField
                  key={`notes-${setIndex}`}
                  field={NOTES}
                  onChange={onChange}
                  set={set}
                />
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </div>
      ) : null}
    </ResponsiveOverlay>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/**
 * Holds what the coach typed and reports up only what parses — `8.` and `` are
 * on screen but not saveable yet. The buffer is per FIELD, so a half-typed RPE
 * cannot touch the reps beside it.
 */
function useFieldText(field: FieldUi, set: PlannedSet, onChange: (patch: Patch) => void) {
  const [text, setText] = useState(() => field.read(set));
  const patch = field.write(text);

  return {
    commit: () => {
      if (field.commitOnBlur && patch) {
        onChange(patch);
      }
    },
    isInvalid: patch === undefined,
    text,
    setText: (next: string) => {
      setText(next);
      const nextPatch = field.write(next);
      if (!field.commitOnBlur && nextPatch) {
        onChange(nextPatch);
      }
    },
  };
}

interface FieldProps {
  field: FieldUi;
  set: PlannedSet;
  onChange: (patch: Patch) => void;
}

/** A bordered box: label, big centred value, optional unit chips beneath. */
function BoxField({field, set, onChange}: FieldProps) {
  const {commit, isInvalid, text, setText} = useFieldText(field, set, onChange);

  return (
    <div className={BOX_CLASS}>
      <TextField
        isInvalid={isInvalid}
        onBlur={commit}
        onChange={setText}
        value={text}
      >
        <Label className={LABEL_CLASS}>{field.label}</Label>
        <Input
          className={BOX_INPUT_CLASS}
          inputMode={field.mode}
          placeholder="—"
        />
        {isInvalid ? <ErrorMessage>{field.invalidMessage ?? 'Enter a valid number'}</ErrorMessage> : null}
      </TextField>
      {field.units?.(set, onChange)}
    </div>
  );
}

/** The unboxed variant, for the advanced section. */
function PlainField({field, set, onChange}: FieldProps) {
  const {commit, isInvalid, text, setText} = useFieldText(field, set, onChange);

  return (
    <TextField
      isInvalid={isInvalid}
      onBlur={commit}
      onChange={setText}
      value={text}
    >
      <Label className={LABEL_CLASS}>{field.label}</Label>
      {field.multiline ? (
        <TextArea
          placeholder={field.placeholder}
          rows={2}
        />
      ) : (
        <Input
          {...(field.mode ? {inputMode: field.mode} : {})}
          {...(field.placeholder ? {placeholder: field.placeholder} : {})}
        />
      )}
      {isInvalid ? <ErrorMessage>{field.invalidMessage ?? 'Enter a valid number'}</ErrorMessage> : null}
    </TextField>
  );
}

// ---------------------------------------------------------------------------

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Every single-select in this editor: set type and both unit rows. */
function SingleToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  buttonClassName,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className: string;
  buttonClassName?: string;
}) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className={className}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        const match = options.find((option) => option.value === next);
        if (match) {
          onChange(match.value);
        }
      }}
      selectedKeys={[value]}
      selectionMode="single"
    >
      {options.map((option) => (
        <ToggleButton
          {...(buttonClassName ? {className: buttonClassName} : {})}
          id={option.value}
          key={option.value}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
