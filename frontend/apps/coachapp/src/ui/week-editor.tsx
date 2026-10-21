import {createContext, type ReactNode, useContext, useEffect, useId, useState} from 'react';
import {Button} from './button';
import {cn} from './cn';
import {Dialog, DialogDescription, DialogHeader, DialogTitle} from './dialog';
import {FormError} from './form-error';
import {Input} from './input';
import {weekdays} from './week';

export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive';
export const errorClass = 'text-sm font-medium text-destructive';
export type Commit = (result: {undo_token: string}, message: string) => void;
export type Undo<T> = {message: string; before: T};
export const DraftGuard = createContext<(id: string, active: boolean, pending: boolean) => void>(() => undefined);
export function useDraftGuard(dirty: boolean, pending = false) {
  const register = useContext(DraftGuard);
  const id = useId();
  useEffect(() => {
    register(id, dirty || pending, pending);
    return () => register(id, false, false);
  }, [register, id, dirty, pending]);
}

export function SaveRecovery({
  recovery,
}: {
  recovery: {
    error: string | undefined;
    uncertain: boolean;
    checking: boolean;
    conflict: boolean;
    check: () => void;
    discard: () => void;
  };
}) {
  return (
    <div className="space-y-3">
      <FormError message={recovery.error} />
      {recovery.uncertain && (
        <Button
          variant="outline"
          isPending={recovery.checking}
          onPress={recovery.check}
        >
          Check saved week
        </Button>
      )}
      {recovery.conflict && (
        <Button
          variant="ghost"
          isDisabled={recovery.checking}
          onPress={recovery.discard}
        >
          Discard draft and view saved week
        </Button>
      )}
    </div>
  );
}

export function UndoToast<T>({
  undo,
  onUndo,
  onExpire,
  pending = false,
  error,
}: {
  undo: Undo<T> | null;
  onUndo: (before: T) => void;
  onExpire: () => void;
  pending?: boolean;
  error?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!undo) {
      setHovered(false);
      setFocused(false);
    }
  }, [undo]);
  useEffect(() => {
    if (!undo || hovered || focused || pending || error) {
      return;
    }
    const timer = window.setTimeout(onExpire, 8000);
    return () => window.clearTimeout(timer);
  }, [undo, hovered, focused, pending, error, onExpire]);
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      {undo && (
        <div
          className="flex max-w-md min-w-0 flex-wrap items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setFocused(false);
            }
          }}
        >
          <span className="min-w-0 flex-1 break-words">{undo.message}</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/15 data-pressed:bg-background/25"
            isPending={pending}
            onPress={() => onUndo(undo.before)}
          >
            Undo
          </Button>
          {error && (
            <p
              role="alert"
              className="w-full pb-1 text-sm"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EditDialog({
  title,
  description,
  dirty,
  pending = false,
  canClose = true,
  recovery,
  footer,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  dirty: boolean;
  pending?: boolean;
  canClose?: boolean;
  recovery?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useDraftGuard(dirty || !canClose, pending || !canClose);
  return (
    <Dialog
      className="nutrition-dialog"
      isOpen
      isDismissable={!dirty && !pending && canClose}
      isKeyboardDismissDisabled={dirty || pending || !canClose}
      showCloseButton={!pending && canClose}
      onOpenChange={(open) => {
        if (!open && !pending && canClose) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <div className="space-y-1 pr-10">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        {recovery}
        <fieldset
          disabled={pending || !canClose}
          className="min-w-0 space-y-5"
        >
          {children}
        </fieldset>
      </div>
      {footer && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-border px-5 py-3">
          {footer}
        </div>
      )}
    </Dialog>
  );
}

export function WeekdayPicker({mask, onChange}: {mask: number; onChange: (mask: number) => void}) {
  return (
    <div
      role="group"
      aria-label="Days of the week"
      className="grid grid-cols-7 gap-1"
    >
      {weekdays.map((day) => {
        const on = (mask & day.bit) !== 0;
        return (
          <Button
            key={day.bit}
            size="xs"
            variant="outline"
            aria-pressed={on}
            aria-label={day.long}
            className={cn(
              'nutrition-weekday px-0 text-muted-foreground',
              on && 'border-foreground bg-muted font-bold text-foreground',
            )}
            onPress={() => onChange(mask ^ day.bit)}
          >
            {day.short.slice(0, 2)}
          </Button>
        );
      })}
    </div>
  );
}

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="sticky -top-5 z-10 -mx-1 grid gap-2 bg-surface px-1 pt-1 pb-2 text-sm font-medium sm:-top-6"
    >
      {label}
      <Input
        id={id}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, 'font-normal')}
      />
    </label>
  );
}
