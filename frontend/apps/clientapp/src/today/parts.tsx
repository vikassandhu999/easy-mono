import {ArrowLeft, Check, Timer} from 'lucide-react';
import {type RefObject, useEffect, useRef, useState} from 'react';
import {FieldError, Radio, RadioGroup, Text, TextField} from 'react-aria-components';
import {useFoods} from '../api/foods';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {ReadState} from '../ui/read-state';
import {type Food, totalOf, valuesLine} from './model';

// A controlled text field built from the app's own Label, Input and error text.
export function Field({
  label,
  labelContext,
  value,
  onChange,
  error,
  description,
  hideLabel = false,
  className,
  inputClassName,
  ...input
}: {
  label: string;
  labelContext?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  description?: string;
  hideLabel?: boolean;
  className?: string;
  inputClassName?: string;
  type?: string;
  inputMode?: 'decimal' | 'numeric' | 'search' | 'text';
  isDisabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <TextField
      className={cn('grid gap-2', className)}
      value={value}
      onChange={onChange}
      isInvalid={Boolean(error)}
      validationBehavior="aria"
      {...(input.isDisabled ? {isDisabled: true} : {})}
      {...(input.autoFocus ? {autoFocus: true} : {})}
      {...(hideLabel ? {'aria-label': label} : {})}
    >
      {!hideLabel && (
        <Label>
          {labelContext && <span className="sr-only">{labelContext} </span>}
          {label}
        </Label>
      )}
      <Input
        {...(input.type ? {type: input.type} : {})}
        {...(input.inputMode ? {inputMode: input.inputMode} : {})}
        {...(inputClassName ? {className: inputClassName} : {})}
      />
      {description && (
        <Text
          slot="description"
          className="text-sm text-muted-foreground"
        >
          {description}
        </Text>
      )}
      <FieldError className="text-sm font-medium text-destructive">{error}</FieldError>
    </TextField>
  );
}

// One choice among a few, shown as large radio buttons (form-design: visible options beat a select on a phone).
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: Array<{value: T; label: string}>;
  onChange: (value: T) => void;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value ?? null}
      onChange={(next) => onChange(next as T)}
      className={cn('grid gap-2', options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          value={option.value}
          className="grid min-h-12 cursor-pointer place-items-center rounded-2xl border border-input bg-surface px-2 py-2 text-center text-sm font-bold outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring data-selected:border-primary data-selected:bg-[var(--training)]"
        >
          {option.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}

// One header for every screen: back to the day it came from, title, and the day with its planned time (layout
// consistency). The title takes focus when the screen opens, so screen readers hear where they are.
export function ScreenHeader({
  title,
  subtitle,
  back,
  onBack,
  headingRef,
}: {
  title: string;
  subtitle: string;
  back?: string;
  onBack?: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header className="page-heading">
      {back && onBack && (
        <Button
          variant="ghost"
          aria-label={`Back to ${back}`}
          className="size-11 rounded-full p-0"
          onPress={onBack}
        >
          <ArrowLeft
            className="size-5"
            aria-hidden="true"
          />
        </Button>
      )}
      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[2rem] leading-[1.12] font-extrabold tracking-tight outline-none"
        >
          {title}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}

export function useFocusOnMount() {
  const ref = useRef<HTMLHeadingElement>(null);
  // Block body: an effect must return nothing or a cleanup function, never the call's result.
  useEffect(() => {
    ref.current?.focus({preventScroll: true});
  }, []);
  return ref;
}

export function FoodSearchSheet({
  title,
  onPick,
  onClose,
}: {
  title: string;
  onPick: (food: Food) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const query = useFoods(search);
  const matches = query.data?.data ?? [];
  return (
    <BottomSheet
      title={title}
      onClose={onClose}
    >
      <div className="sticky -top-3 z-10 bg-background pb-3">
        <Field
          label="Search foods and supplements"
          type="search"
          inputMode="search"
          value={search}
          onChange={setSearch}
          autoFocus
        />
      </div>
      {!query.data ? (
        <ReadState
          label="foods"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground">Nothing matches “{search.trim()}”.</p>
      ) : (
        <ul className="grid gap-1">
          {matches.map((food, index) => (
            <li key={food.id}>
              <Button
                variant="ghost"
                {...(matches.filter((row) => row.name === food.name).length > 1
                  ? {'aria-label': `${food.name} (result ${index + 1})`}
                  : {})}
                className="h-auto min-h-12 w-full flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                onPress={() => onPick(food)}
              >
                <span>
                  {food.name}
                  {food.kind === 'supplement' && (
                    <span className="ml-2 text-sm font-medium text-muted-foreground">supplement</span>
                  )}
                </span>
                <span className="text-sm font-medium text-muted-foreground tabular-nums">{perLine(food)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

// Values for one serving when the food has one, else for its basis (100 g, 100 ml, 1 capsule).
function perLine(food: Food) {
  const serving = food.servings[0];
  const amount = serving || food.basis === '1unit' ? 1 : 100;
  const per = serving
    ? serving.label
    : food.basis === '1unit'
      ? `1 ${food.unit_label ?? 'unit'}`
      : `100 ${food.basis === '100ml' ? 'ml' : 'g'}`;
  return `${valuesLine(totalOf([{food, amount, unit: serving?.label ?? (food.basis === '1unit' ? 'unit' : food.basis === '100ml' ? 'ml' : 'g')}]))} · per ${per}`;
}

// Status pills only for real signals (Done, Taken, In progress); text and an icon, never colour alone.
export function StatusPill({tone, children}: {tone: 'done' | 'active'; children: string}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold',
        tone === 'done' ? 'bg-[var(--progress)]' : 'bg-[var(--training)]',
      )}
    >
      {tone === 'done' ? (
        <Check
          className="size-4"
          aria-hidden="true"
        />
      ) : (
        <Timer
          className="size-4"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
