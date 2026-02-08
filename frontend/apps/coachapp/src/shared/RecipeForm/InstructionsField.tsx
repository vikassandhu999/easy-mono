import {Button, FieldError, Input, Text, TextField} from '@heroui/react';
import {IconGripVertical, IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {CreateRecipeForm} from '@/services/recipes';

type InstructionsFieldProps = {
  form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const InstructionsField: FC<InstructionsFieldProps> = ({form}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<null | number>(null);
  const [dragOverIndex, setDragOverIndex] = useState<null | number>(null);
  const {
    watch,
    setValue,
    formState: {errors},
  } = form;

  const watchedInstructions = watch('instructions');
  const instructions = useMemo(() => watchedInstructions ?? [], [watchedInstructions]);

  // Helper functions to manage the string array
  const append = useCallback(
    (value: string) => {
      setValue('instructions', [...instructions, value], {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [instructions, setValue],
  );

  const remove = useCallback(
    (index: number) => {
      const newInstructions = instructions.filter((_, i) => i !== index);
      setValue('instructions', newInstructions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [instructions, setValue],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newInstructions = [...instructions];
      const [removed] = newInstructions.splice(fromIndex, 1);
      newInstructions.splice(toIndex, 0, removed as string);
      setValue('instructions', newInstructions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [instructions, setValue],
  );

  const updateInstruction = useCallback(
    (index: number, value: string) => {
      const newInstructions = [...instructions];
      newInstructions[index] = value;
      setValue('instructions', newInstructions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [instructions, setValue],
  );

  // Auto-add first empty step if none exist
  useEffect(() => {
    if (instructions.length === 0) {
      setValue('instructions', ['']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus the last input when a new step is added
  useEffect(() => {
    if (instructions.length > 0) {
      const lastInput = inputRefs.current[instructions.length - 1];
      if (lastInput && document.activeElement?.tagName !== 'INPUT') {
        // Only auto-focus if user isn't already typing
      }
    }
  }, [instructions.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        append('');
        // Focus will happen via the effect after state updates
        setTimeout(() => {
          inputRefs.current[idx + 1]?.focus();
        }, 50);
      } else if (e.key === 'Backspace' && e.currentTarget.value === '' && instructions.length > 1) {
        e.preventDefault();
        remove(idx);
        // Focus previous input
        setTimeout(() => {
          inputRefs.current[Math.max(0, idx - 1)]?.focus();
        }, 50);
      } else if (e.key === 'ArrowUp' && e.altKey && idx > 0) {
        // Alt+ArrowUp to move step up
        e.preventDefault();
        move(idx, idx - 1);
        setTimeout(() => {
          inputRefs.current[idx - 1]?.focus();
        }, 50);
      } else if (e.key === 'ArrowDown' && e.altKey && idx < instructions.length - 1) {
        // Alt+ArrowDown to move step down
        e.preventDefault();
        move(idx, idx + 1);
        setTimeout(() => {
          inputRefs.current[idx + 1]?.focus();
        }, 50);
      }
    },
    [append, remove, move, instructions.length],
  );

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      move(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="rounded-2xl border border-default-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-default-900">Instructions</Text>
        {instructions.length > 0 && (
          <Text className="text-xs text-default-500">
            {instructions.length} {instructions.length === 1 ? 'step' : 'steps'}
          </Text>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {instructions.map((_, idx) => (
          <div
            className={`flex items-start gap-3 rounded-xl border border-default-200 bg-default-50 p-3 transition ${
              draggedIndex === idx ? 'border-default-400 bg-default-100' : ''
            } ${dragOverIndex === idx ? 'ring-2 ring-default-300' : ''}`}
            draggable
            key={idx}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragStart={() => handleDragStart(idx)}
          >
            <span className="mt-2 text-default-400">
              <IconGripVertical size={16} />
            </span>
            <span className="mt-1 text-xs font-semibold text-default-500">{idx + 1}</span>
            <div className="flex-1">
              <Controller
                control={form.control}
                name={`instructions.${idx}` as const}
                render={({field, fieldState}) => (
                  <TextField isInvalid={Boolean(fieldState.error?.message)}>
                    <Input
                      className="w-full"
                      onChange={(event) => {
                        field.onChange(event);
                        updateInstruction(idx, event.target.value);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      placeholder={idx === 0 ? 'e.g. Preheat oven to 180°C' : 'Next step...'}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      value={field.value ?? ''}
                    />
                    {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
                  </TextField>
                )}
              />
            </div>
            {instructions.length > 1 && (
              <Button
                aria-label="Remove step"
                className="h-9 w-9 min-w-9"
                isIconOnly
                onPress={() => remove(idx)}
                size="sm"
                variant="ghost"
              >
                <IconTrash size={16} />
              </Button>
            )}
          </div>
        ))}
        <Button
          className="h-11 justify-start gap-2 rounded-xl border border-dashed border-default-300 text-default-600"
          onPress={() => append('')}
          variant="ghost"
        >
          <span className="flex items-center gap-2">
            <IconPlus size={16} />
            Add step
          </span>
        </Button>
        {errors.instructions?.message && (
          <Text className="text-xs text-danger-600">{errors.instructions.message as string}</Text>
        )}
        <Text className="text-xs text-default-500">Enter: new step • Backspace: delete empty • Alt+↑↓: reorder</Text>
      </div>
    </div>
  );
};

export default InstructionsField;
