import {ActionIcon, Text, TextInput} from '@mantine/core';
import {IconGripVertical, IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useCallback, useEffect, useRef, useState} from 'react';
import {useFieldArray, UseFormReturn} from 'react-hook-form';

import {CreateRecipeForm} from '@/services/recipes';

import classes from './styles.module.css';

type InstructionsFieldProps = {
    form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const InstructionsField: FC<InstructionsFieldProps> = ({form}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<null | number>(null);
    const [dragOverIndex, setDragOverIndex] = useState<null | number>(null);
    const {
        register,
        control,
        formState: {errors},
    } = form;

    // TypeScript incorrectly infers only 'ingredients' as valid field name for useFieldArray
    const {fields, append, remove, move} = useFieldArray({
        control,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        name: 'instructions',
    });

    // Auto-add first empty step if none exist
    useEffect(() => {
        if (fields.length === 0) {
            // @ts-expect-error - Type inference issue with append accepting string
            append('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Focus the last input when a new step is added
    useEffect(() => {
        if (fields.length > 0) {
            const lastInput = inputRefs.current[fields.length - 1];
            if (lastInput && document.activeElement?.tagName !== 'INPUT') {
                // Only auto-focus if user isn't already typing
            }
        }
    }, [fields.length]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // @ts-expect-error - Type inference issue with append accepting string
                append('');
                // Focus will happen via the effect after state updates
                setTimeout(() => {
                    inputRefs.current[idx + 1]?.focus();
                }, 50);
            } else if (e.key === 'Backspace' && e.currentTarget.value === '' && fields.length > 1) {
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
            } else if (e.key === 'ArrowDown' && e.altKey && idx < fields.length - 1) {
                // Alt+ArrowDown to move step down
                e.preventDefault();
                move(idx, idx + 1);
                setTimeout(() => {
                    inputRefs.current[idx + 1]?.focus();
                }, 50);
            }
        },
        [append, remove, move, fields.length],
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
        <div className={classes.section}>
            <div className={classes.sectionHeader}>
                <div className={classes.sectionTitleRow}>
                    <span className={classes.sectionTitle}>Instructions</span>
                    {fields.length > 0 && (
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            {fields.length} {fields.length === 1 ? 'step' : 'steps'}
                        </Text>
                    )}
                </div>
            </div>

            <div className={classes.instructionsList}>
                {fields.map((field, idx) => (
                    <div
                        className={`${classes.instructionStep} ${draggedIndex === idx ? classes.instructionStepDragging : ''} ${dragOverIndex === idx ? classes.instructionStepDragOver : ''}`}
                        draggable
                        key={field.id}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragStart={() => handleDragStart(idx)}
                    >
                        <span className={classes.dragHandle}>
                            <IconGripVertical size={14} />
                        </span>
                        <span className={classes.stepNumber}>{idx + 1}</span>
                        <TextInput
                            {...register(`instructions.${idx}`)}
                            className={classes.stepInput}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            placeholder={idx === 0 ? 'e.g. Preheat oven to 180°C' : 'Next step...'}
                            ref={(el) => {
                                inputRefs.current[idx] = el;
                            }}
                            size="sm"
                        />
                        {fields.length > 1 && (
                            <ActionIcon
                                aria-label="Remove step"
                                className={classes.stepDelete}
                                color="gray"
                                onClick={() => remove(idx)}
                                size="sm"
                                variant="subtle"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        )}
                    </div>
                ))}
                <button
                    className={classes.addStepButton}
                    // @ts-expect-error - Type inference issue with append accepting string
                    onClick={() => append('')}
                    type="button"
                >
                    <IconPlus size={14} />
                    <span>Add step</span>
                </button>
                {errors.instructions?.message && (
                    <Text
                        c="red"
                        size="xs"
                    >
                        {errors.instructions.message as string}
                    </Text>
                )}
                <Text
                    c="dimmed"
                    className={classes.keyboardHint}
                    size="xs"
                >
                    Enter: new step • Backspace: delete empty • Alt+↑↓: reorder
                </Text>
            </div>
        </div>
    );
};

export default InstructionsField;
