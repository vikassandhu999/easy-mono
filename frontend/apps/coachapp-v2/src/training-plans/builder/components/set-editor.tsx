/**
 * The set value editor (badge TB) — a `ResponsiveOverlay`, so it is an anchored
 * popover on desktop and a keyboard-docked sheet on mobile.
 *
 * There is no draft object and no save button. Every control writes straight
 * through `onChange`, which patches the cache at once and lets the set writer
 * decide when to send; the row behind the editor updates as the coach types.
 *
 * Which fields appear is `tracking.ts`'s answer, and each one is a descriptor
 * below rather than its own block of JSX — five near-identical conditionals is
 * how they drift apart.
 */
import {
  Button,
  Disclosure,
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
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';

import {type PlannedSet, parseRpe, parseWholeNumber} from '../sets';
import {type FieldKey, fieldsFor} from '../tracking';

type LoadUnit = NonNullable<PlannedSet['load_unit']>;
type DistanceUnit = NonNullable<PlannedSet['distance_unit']>;
type SetType = NonNullable<PlannedSet['set_type']>;

const SET_TYPES: Option<SetType>[] = [
  {value: 'working', label: 'Working'},
  {value: 'warmup', label: 'Warm-up'},
  {value: 'dropset', label: 'Drop'},
];

const LOAD_UNITS: Option<LoadUnit>[] = [
  {value: 'kg', label: 'kg'},
  {value: 'lbs', label: 'lbs'},
  {value: 'bodyweight', label: 'bw'},
];

const DISTANCE_UNITS: Option<DistanceUnit>[] = [
  {value: 'meters', label: 'm'},
  {value: 'km', label: 'km'},
  {value: 'miles', label: 'mi'},
];

// Unit chips (kg/lbs/bw, m/km/mi) — GAPS #7: also a ToggleButtonGroup.
const UNIT_BUTTON_CLASS =
  'min-h-9 rounded-chip border border-border bg-transparent px-2 type-eyebrow font-medium text-muted ' +
  'data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent';

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
  mode: 'decimal' | 'numeric';
  /** The text to show for this set. */
  read: (set: PlannedSet) => string;
  /** The patch to save, or `undefined` while the text isn't saveable yet. */
  write: (text: string) => Patch | undefined;
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
  };
}

/** The editor offers m/km/mi; a stored `none` (or null) reads as meters, which
 *  is also how the row summary renders it. */
function editorDistanceUnit(unit: DistanceUnit | null | undefined): DistanceUnit {
  return unit === 'km' || unit === 'miles' ? unit : 'meters';
}

const FIELDS: Record<FieldKey, FieldUi> = {
  reps: {label: 'Reps', mode: 'numeric', ...textColumn('reps')},
  load: {
    label: 'Weight',
    mode: 'decimal',
    ...textColumn('load_value'),
    units: (set, onChange) => (
      <SingleToggle
        buttonClassName={UNIT_BUTTON_CLASS}
        className="mt-1.5 flex justify-center gap-1"
        label="Weight unit"
        onChange={(unit) => onChange({load_unit: unit})}
        options={LOAD_UNITS}
        value={set.load_unit ?? 'kg'}
      />
    ),
  },
  rpe: {label: 'RPE', mode: 'decimal', ...numberColumn('rpe', parseRpe)},
  duration: {label: 'Secs', mode: 'numeric', ...numberColumn('duration_seconds', parseWholeNumber)},
  distance: {
    label: 'Dist',
    mode: 'decimal',
    ...textColumn('distance_value'),
    units: (set, onChange) => (
      <SingleToggle
        buttonClassName={UNIT_BUTTON_CLASS}
        className="mt-1.5 flex justify-center gap-1"
        label="Distance unit"
        onChange={(unit) => onChange({distance_unit: unit})}
        options={DISTANCE_UNITS}
        value={editorDistanceUnit(set.distance_unit)}
      />
    ),
  },
};

/** The two behind "Rest timer and notes". */
const REST: FieldUi = {
  label: 'Rest (seconds)',
  mode: 'numeric',
  placeholder: '90',
  ...numberColumn('rest_seconds', parseWholeNumber),
};

const NOTES: FieldUi = {
  label: 'Notes',
  mode: 'numeric',
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
 * Holds what the coach typed and reports up only what parses.
 *
 * `8.` and `` are not values yet, but they are what is on screen. The buffer is
 * per FIELD, so a half-typed RPE cannot touch the reps beside it — which a
 * shared per-set draft object could, and did.
 */
function useFieldText(field: FieldUi, set: PlannedSet, onChange: (patch: Patch) => void) {
  const [text, setText] = useState(() => field.read(set));

  return {
    text,
    setText: (next: string) => {
      setText(next);
      const patch = field.write(next);
      if (patch) {
        onChange(patch);
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
  const {text, setText} = useFieldText(field, set, onChange);

  return (
    <div className={BOX_CLASS}>
      <TextField
        onChange={setText}
        value={text}
      >
        <Label className={LABEL_CLASS}>{field.label}</Label>
        <Input
          className={BOX_INPUT_CLASS}
          inputMode={field.mode}
          placeholder="—"
        />
      </TextField>
      {field.units?.(set, onChange)}
    </div>
  );
}

/** The unboxed variant, for the advanced section. */
function PlainField({field, set, onChange}: FieldProps) {
  const {text, setText} = useFieldText(field, set, onChange);

  return (
    <TextField
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
          inputMode={field.mode}
          placeholder={field.placeholder}
        />
      )}
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
        if (next !== undefined) {
          onChange(next as T);
        }
      }}
      selectedKeys={[value]}
      selectionMode="single"
    >
      {options.map((option) => (
        <ToggleButton
          className={buttonClassName}
          id={option.value}
          key={option.value}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
