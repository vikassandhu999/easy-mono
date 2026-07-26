/**
 * The set value editor (badge TB) — a `ResponsiveOverlay`, so it is an anchored
 * popover on desktop and a keyboard-docked sheet on mobile.
 *
 * There is no draft object and no save button. Every control writes straight
 * through `onChange`, which patches the cache at once and lets the set writer
 * decide when to send; the row behind the editor updates as the coach types.
 * The old version kept a whole-set draft plus two refs to stop its own saves
 * from clobbering it — all of that was the cost of local state that mirrored
 * the server.
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

import type {TrainingPlanWorkoutExercise} from '@/api/generated';
import {ResponsiveOverlay} from '@/builder-kit/responsive-overlay';

import {fieldsForTrackingType, type PlannedSet, parseRpe, parseWholeNumber} from '../model';

type LoadUnit = NonNullable<PlannedSet['load_unit']>;
type DistanceUnit = NonNullable<PlannedSet['distance_unit']>;
type SetType = NonNullable<PlannedSet['set_type']>;

const SET_TYPES: {value: SetType; label: string}[] = [
  {value: 'working', label: 'Working'},
  {value: 'warmup', label: 'Warm-up'},
  {value: 'dropset', label: 'Drop'},
];

const LOAD_UNITS: {value: LoadUnit; label: string}[] = [
  {value: 'kg', label: 'kg'},
  {value: 'lbs', label: 'lbs'},
  {value: 'bodyweight', label: 'bw'},
];

const DISTANCE_UNITS: {value: DistanceUnit; label: string}[] = [
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
const BOX_LABEL_CLASS = 'mb-1 block type-eyebrow uppercase tracking-wider text-muted';
const BOX_INPUT_CLASS =
  'h-auto border-0 bg-transparent px-0 text-center type-heading font-semibold text-foreground shadow-none';

/** The editor offers m/km/mi; a stored `none` (or null) reads as meters, which
 *  is also how the row summary renders it. */
function editorDistanceUnit(unit: DistanceUnit | null | undefined): DistanceUnit {
  return unit === 'km' || unit === 'miles' ? unit : 'meters';
}

interface SetEditorProps {
  element: TrainingPlanWorkoutExercise;
  setIndex: number;
  /** The row (or `+ Add set` button) the desktop popover anchors to. */
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onChange: (values: Partial<PlannedSet>) => void;
}

export function SetEditor({element, setIndex, anchorRef, isOpen, onClose, onSelectIndex, onChange}: SetEditorProps) {
  const set = element.planned_sets[setIndex];
  const trackingType = element.exercise?.tracking_type ?? null;
  const fields = fieldsForTrackingType(trackingType);
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

          <ToggleButtonGroup
            aria-label="Set type"
            className="segmented mb-3"
            onSelectionChange={(keys) => {
              const next = [...keys][0] as SetType | undefined;
              if (next) {
                onChange({set_type: next});
              }
            }}
            selectedKeys={[set.set_type ?? 'working']}
            selectionMode="single"
          >
            {SET_TYPES.map(({value, label}) => (
              <ToggleButton
                id={value}
                key={value}
              >
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <div className="mb-3 flex gap-2">
            {fields.showReps ? (
              <ValueBox
                inputMode="numeric"
                label="Reps"
                onChange={(text) => onChange({reps: text || null})}
                value={set.reps ?? ''}
              />
            ) : null}

            {fields.showLoad ? (
              <ValueBox
                inputMode="decimal"
                label="Weight"
                onChange={(text) => onChange({load_value: text || null})}
                units={
                  <UnitToggle
                    label="Weight unit"
                    onChange={(unit) => onChange({load_unit: unit})}
                    options={LOAD_UNITS}
                    value={set.load_unit ?? 'kg'}
                  />
                }
                value={set.load_value ?? ''}
              />
            ) : null}

            {fields.showRpe ? (
              <NumberBox
                initial={set.rpe}
                inputMode="decimal"
                key={`rpe-${setIndex}`}
                label="RPE"
                onChange={(value) => onChange({rpe: value})}
                parse={parseRpe}
              />
            ) : null}

            {fields.showDuration ? (
              <NumberBox
                initial={set.duration_seconds}
                inputMode="numeric"
                key={`duration-${setIndex}`}
                label="Secs"
                onChange={(value) => onChange({duration_seconds: value})}
                parse={parseWholeNumber}
              />
            ) : null}

            {fields.showDistance ? (
              <ValueBox
                inputMode="decimal"
                label="Dist"
                onChange={(text) => onChange({distance_value: text || null})}
                units={
                  <UnitToggle
                    label="Distance unit"
                    onChange={(unit) => onChange({distance_unit: unit})}
                    options={DISTANCE_UNITS}
                    value={editorDistanceUnit(set.distance_unit)}
                  />
                }
                value={set.distance_value ?? ''}
              />
            ) : null}
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
                <RestSecondsField
                  initial={set.rest_seconds}
                  key={`rest-${setIndex}`}
                  label="Rest (seconds)"
                  onChange={(value) => onChange({rest_seconds: value})}
                  placeholder="90"
                />
                <TextField
                  onChange={(text) => onChange({notes: text || null})}
                  value={set.notes ?? ''}
                >
                  <Label className={BOX_LABEL_CLASS}>Notes</Label>
                  <TextArea
                    placeholder="Tempo, cues, %1RM targets…"
                    rows={2}
                  />
                </TextField>
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

/** A bordered value box: label, big centred input, optional unit chips beneath. */
function ValueBox({
  label,
  value,
  onChange,
  inputMode,
  units,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  inputMode: 'numeric' | 'decimal';
  units?: ReactNode;
}) {
  return (
    <div className={BOX_CLASS}>
      <TextField
        onChange={onChange}
        value={value}
      >
        <Label className={BOX_LABEL_CLASS}>{label}</Label>
        <Input
          className={BOX_INPUT_CLASS}
          inputMode={inputMode}
          placeholder="—"
        />
      </TextField>
      {units}
    </div>
  );
}

/**
 * The same box for a field the API stores as a number.
 *
 * `8.` and `` are not numbers but the coach is mid-word, so the typed text is
 * buffered here and reported up only once it parses. The buffer is per FIELD —
 * a half-typed RPE cannot touch the reps beside it, which a shared per-set
 * draft object could, and did. It is keyed by set index at the call site, so
 * stepping to another set starts clean.
 */
function useTypedNumber(
  initial: number | null,
  parse: (text: string) => number | null | undefined,
  onChange: (value: number | null) => void,
) {
  const [text, setText] = useState(initial == null ? '' : String(initial));

  return {
    text,
    handleChange: (next: string) => {
      setText(next);
      const parsed = parse(next);
      if (parsed !== undefined) {
        onChange(parsed);
      }
    },
  };
}

function NumberBox({
  initial,
  label,
  parse,
  onChange,
  inputMode,
}: {
  initial: number | null;
  label: string;
  parse: (text: string) => number | null | undefined;
  onChange: (value: number | null) => void;
  inputMode: 'numeric' | 'decimal';
}) {
  const {text, handleChange} = useTypedNumber(initial, parse, onChange);

  return (
    <ValueBox
      inputMode={inputMode}
      label={label}
      onChange={handleChange}
      value={text}
    />
  );
}

/** The plain (unboxed) variant, for the advanced section. Deliberately NOT
 *  named `NumberField` — that name belongs to react-aria's control, which this
 *  app never uses for numeric entry (RM-121). */
function RestSecondsField({
  initial,
  label,
  placeholder,
  onChange,
}: {
  initial: number | null;
  label: string;
  placeholder: string;
  onChange: (value: number | null) => void;
}) {
  const {text, handleChange} = useTypedNumber(initial, parseWholeNumber, onChange);

  return (
    <TextField
      onChange={handleChange}
      value={text}
    >
      <Label className={BOX_LABEL_CLASS}>{label}</Label>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
      />
    </TextField>
  );
}

function UnitToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: {value: T; label: string}[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className="mt-1.5 flex justify-center gap-1"
      onSelectionChange={(keys) => {
        const next = [...keys][0] as T | undefined;
        if (next) {
          onChange(next);
        }
      }}
      selectedKeys={[value]}
      selectionMode="single"
    >
      {options.map((option) => (
        <ToggleButton
          className={UNIT_BUTTON_CLASS}
          id={option.value}
          key={option.value}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
