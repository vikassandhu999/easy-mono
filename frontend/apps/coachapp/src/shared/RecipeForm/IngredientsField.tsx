import {humanizeError} from '@easy/error-parser';
import {ActionIcon, Loader, Text, TextInput} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconGripVertical, IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {UseFormReturn, useWatch} from 'react-hook-form';

import {useCreateIngredient, useListIngredients} from '@/services/ingredients';
import {CreateRecipeForm} from '@/services/recipes';
import {notifyError, notifyWarning} from '@/utils/notification';

import classes from './styles.module.css';

type IngredientsFieldProps = {
    form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const IngredientsField: FC<IngredientsFieldProps> = ({form}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const quantityRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const {watch, setValue} = form;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
    const [focusedResultIndex, setFocusedResultIndex] = useState(0);
    const [lastAddedId, setLastAddedId] = useState<null | string>(null);
    const [draggedIndex, setDraggedIndex] = useState<null | number>(null);
    const [dragOverIndex, setDragOverIndex] = useState<null | number>(null);

    const {data, isLoading} = useListIngredients(
        {
            search: debouncedSearchTerm,
        },
        {
            skip: !debouncedSearchTerm,
        },
    );

    const [createIngredientMutation] = useCreateIngredient();

    const fetchedIngredients = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data]);

    const handleSearchTerm: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        setSearchTerm(e.currentTarget.value);
    };

    // Reset focused result when search results change
    useEffect(() => {
        setFocusedResultIndex(0);
    }, [fetchedIngredients]);

    // Auto-focus quantity input when ingredient is added
    useEffect(() => {
        if (lastAddedId) {
            const timer = setTimeout(() => {
                const input = quantityRefs.current.get(lastAddedId);
                input?.focus();
                setLastAddedId(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [lastAddedId]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Add focused result if available
            if (fetchedIngredients.length > 0 && focusedResultIndex < fetchedIngredients.length) {
                addIngredient(fetchedIngredients[focusedResultIndex].id, fetchedIngredients[focusedResultIndex].name);
            } else if (searchTerm && !isLoading && fetchedIngredients.length === 0) {
                // Create new ingredient if no results
                createIngredient();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedResultIndex((prev) => Math.min(prev + 1, fetchedIngredients.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedResultIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
            setSearchTerm('');
            setFocusedResultIndex(0);
            searchInputRef.current?.blur();
        }
    };

    const createIngredient = async () => {
        try {
            const {
                data: {name, id},
            } = await createIngredientMutation({name: searchTerm});

            addIngredient(id, name);
        } catch (err) {
            const errMsg = humanizeError(err);
            notifyError(errMsg);
        }
    };

    const addIngredient = useCallback(
        (id: string, name: string) => {
            const prev = watch('recipe_ingredients') || [];

            const isDuplicate = prev.some((ig) => ig.ingredient_id === id);

            if (isDuplicate) {
                notifyWarning('Same ingredient already exists');
                setSearchTerm('');
                return;
            }

            const newValue = [
                ...prev,
                {
                    ingredient_id: id,
                    position: prev.length,
                    name,
                    quantity_as_text: '',
                },
            ];

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });

            setSearchTerm('');
            setFocusedResultIndex(0);
            // Track the last added ingredient to auto-focus its quantity input
            setLastAddedId(id);
        },
        [watch, setValue],
    );

    const removeIngredient = useCallback(
        (id: string) => {
            const prev = watch('recipe_ingredients') || [];

            const newValue = prev.filter((ig) => ig.ingredient_id !== id);

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });

            setSearchTerm('');
        },
        [watch, setValue],
    );

    const reorderIngredients = useCallback(
        (fromIndex: number, toIndex: number) => {
            const prev = watch('recipe_ingredients') || [];
            if (
                fromIndex === toIndex ||
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= prev.length ||
                toIndex >= prev.length
            ) {
                return;
            }
            const newValue = [...prev];
            const [removed] = newValue.splice(fromIndex, 1);
            newValue.splice(toIndex, 0, removed);
            // Update position values
            const reordered = newValue.map((item, idx) => ({...item, position: idx}));
            setValue('recipe_ingredients', reordered, {
                shouldValidate: true,
                shouldDirty: true,
            });
        },
        [watch, setValue],
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
            reorderIngredients(draggedIndex, dragOverIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
        if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();
            // Focus search input to add more ingredients
            searchInputRef.current?.focus();
        }
    };

    const updateIngredientQuntity = useCallback(
        (id: string, value: string) => {
            const prev = watch('recipe_ingredients') || [];
            const idx = prev.findIndex((ig) => ig.ingredient_id === id);

            if (idx === -1) return;

            const newValue = [...prev];
            newValue[idx] = {...prev[idx], quantity_as_text: value};

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });
        },
        [watch, setValue],
    );

    const currentIngredients = useWatch({
        control: form.control,
        name: 'recipe_ingredients',
        defaultValue: [],
    });

    return (
        <div className={classes.section}>
            <div className={classes.sectionHeader}>
                <div className={classes.sectionTitleRow}>
                    <span className={classes.sectionTitle}>Ingredients</span>
                    {currentIngredients.length > 0 && (
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            {currentIngredients.length} added
                        </Text>
                    )}
                </div>
            </div>

            <div className={classes.sectionContent}>
                {/* Search Input - Always visible at top */}
                <div className={classes.searchInputWrapper}>
                    <TextInput
                        onChange={handleSearchTerm}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search and add ingredients..."
                        ref={searchInputRef}
                        rightSection={
                            isLoading ? (
                                <Loader
                                    color="orange"
                                    size="xs"
                                />
                            ) : null
                        }
                        size="sm"
                        value={searchTerm}
                    />
                </div>

                {/* Search Results - Inline dropdown */}
                {searchTerm && (
                    <div className={classes.searchResults}>
                        {!isLoading && fetchedIngredients.length === 0 && (
                            <button
                                className={classes.createIngredientButton}
                                onClick={createIngredient}
                                type="button"
                            >
                                <IconPlus size={14} />
                                <span>Create "{searchTerm}"</span>
                            </button>
                        )}

                        {!isLoading && fetchedIngredients.length > 0 && (
                            <div className={classes.searchResultsList}>
                                {fetchedIngredients.map((ingredient, idx) => (
                                    <button
                                        className={`${classes.searchResultItem} ${idx === focusedResultIndex ? classes.searchResultItemFocused : ''}`}
                                        key={ingredient.id}
                                        onClick={() => addIngredient(ingredient.id, ingredient.name)}
                                        onMouseEnter={() => setFocusedResultIndex(idx)}
                                        type="button"
                                    >
                                        <Text size="sm">{ingredient?.name}</Text>
                                        <IconPlus size={14} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <Text
                            c="dimmed"
                            className={classes.keyboardHint}
                            size="xs"
                        >
                            ↑↓ Navigate • Enter to add
                            {fetchedIngredients.length === 0 && searchTerm ? ' new' : ''}
                        </Text>
                    </div>
                )}

                {/* Selected ingredients list */}
                {currentIngredients.length > 0 && (
                    <div className={classes.ingredientsList}>
                        {currentIngredients.map((ingredient, idx) => (
                            <div
                                className={`${classes.ingredientItem} ${draggedIndex === idx ? classes.ingredientItemDragging : ''} ${dragOverIndex === idx ? classes.ingredientItemDragOver : ''}`}
                                draggable
                                key={ingredient.ingredient_id}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragStart={() => handleDragStart(idx)}
                            >
                                <span className={classes.dragHandle}>
                                    <IconGripVertical size={14} />
                                </span>
                                <span className={classes.ingredientName}>
                                    {/* @ts-expect-error -- types mistmatch */}
                                    {ingredient?.ingredient?.name || ingredient?.name}
                                </span>
                                <TextInput
                                    className={classes.ingredientQuantity}
                                    onChange={(e) => {
                                        updateIngredientQuntity(ingredient.ingredient_id, e.currentTarget.value);
                                    }}
                                    onKeyDown={(e) => handleQuantityKeyDown(e, idx)}
                                    placeholder="e.g. 200g, 1 cup"
                                    ref={(el) => {
                                        if (el) quantityRefs.current.set(ingredient.ingredient_id, el);
                                    }}
                                    size="xs"
                                    value={ingredient.quantity_as_text || ''}
                                />
                                <ActionIcon
                                    aria-label={`Remove ${ingredient.name}`}
                                    className={classes.ingredientDelete}
                                    color="gray"
                                    onClick={() => removeIngredient(ingredient.ingredient_id)}
                                    size="sm"
                                    variant="subtle"
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {currentIngredients.length === 0 && !searchTerm && (
                    <div className={classes.emptyState}>
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            Start typing to search and add ingredients
                        </Text>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IngredientsField;
