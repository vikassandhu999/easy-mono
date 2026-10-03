import {type Ref, useEffect, useState} from 'react';
import {useHandleAvailability} from '../api/business';
import {Button} from './button';
import {FormError} from './form-error';
import {Input} from './input';
import {Label} from './label';

export function validateBusinessHandle(value: string) {
  return (
    (value.length >= 3 && value.length <= 40 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) ||
    'Use 3–40 lowercase letters or numbers, separated by single hyphens.'
  );
}
export function suggestBusinessHandle(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
}
export function BusinessHandle({
  value,
  onChange,
  onBlur,
  isDisabled,
  error,
  currentHandle,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isDisabled: boolean;
  error?: string | undefined;
  currentHandle?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timeout);
  }, [value]);
  const valid = validateBusinessHandle(value);
  const availability = useHandleAvailability(
    debounced,
    Boolean(debounced) && validateBusinessHandle(debounced) === true && debounced !== currentHandle,
  );
  const checking = value !== debounced || availability.isFetching;
  return (
    <div className="grid gap-2">
      <Label htmlFor="business-handle">Business handle</Label>
      <Input
        id="business-handle"
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={isDisabled}
        maxLength={40}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(error) || Boolean(value && valid !== true)}
        aria-describedby="business-handle-help"
      />
      <p
        id="business-handle-help"
        className="text-sm text-muted-foreground"
      >
        Your unique address: 3–40 lowercase letters, numbers and single hyphens.
      </p>
      <FormError message={error || (value && valid !== true ? valid : undefined)} />
      {value && valid === true && (
        <p
          role="status"
          className="text-sm"
        >
          {value === currentHandle
            ? 'Your current handle'
            : checking
              ? 'Checking availability…'
              : availability.data
                ? availability.data.available
                  ? 'Handle available'
                  : 'This handle is unavailable'
                : ''}
        </p>
      )}
      {availability.isError && value === debounced && (
        <div className="space-y-2">
          <FormError message="Could not check handle availability." />
          <Button
            variant="outline"
            onPress={() => {
              availability.refetch();
            }}
          >
            Check again
          </Button>
        </div>
      )}
    </div>
  );
}
