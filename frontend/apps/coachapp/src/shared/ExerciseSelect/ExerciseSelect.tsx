import {Loader, Menu, Text, TextInput} from '@mantine/core';
import {useDebouncedCallback, useLocalStorage} from '@mantine/hooks';
import {CheckIcon, XIcon} from '@phosphor-icons/react';
import {IconBarbell, IconChevronDown, IconHistory, IconPlus} from '@tabler/icons-react';
import {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';

import {Exercise, useListExercises} from '@/services/exercises';
import {Muscle, useListMuscles} from '@/services/muscles';

import classes from './styles.module.css';

interface ExerciseCardProps {
    exercise: Exercise;
    focused: boolean;
    isSelected: boolean;
    onSelect: () => void;
}

const ExerciseCard = ({exercise, isSelected, onSelect, focused}: ExerciseCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // Scroll into view when focused
    useEffect(() => {
        if (focused && cardRef.current) {
            cardRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    }, [focused]);

    return (
        <div
            aria-selected={isSelected}
            className={`${classes.exerciseCard} ${isSelected ? classes.selected : ''} ${focused ? classes.focused : ''}`}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            ref={cardRef}
            role="option"
            tabIndex={0}
        >
            {/* Exercise Icon */}
            <div className={classes.exerciseIcon}>
                <IconBarbell size={24} />
            </div>

            {/* Exercise Info */}
            <div className={classes.exerciseInfo}>
                <span className={classes.exerciseName}>{exercise.name}</span>
                <div className={classes.exerciseMeta}>
                    {exercise.muscles && exercise.muscles.length > 0 && (
                        <span className={classes.muscleTag}>{exercise.muscles.map((m) => m.name).join(', ')}</span>
                    )}
                    {exercise.equipment && exercise.equipment.length > 0 && (
                        <span className={classes.equipmentText}>
                            {exercise.equipment.map((e) => e.name).join(', ')}
                        </span>
                    )}
                </div>
                {exercise.description && <span className={classes.exerciseDescription}>{exercise.description}</span>}
            </div>

            {/* Selection Indicator */}
            <div className={classes.selectionIndicator}>
                {isSelected && (
                    <CheckIcon
                        size={14}
                        weight="bold"
                    />
                )}
            </div>
        </div>
    );
};

export interface ExerciseSelectHandle {
    handleSave: () => void;
}

interface ExerciseSelectProps {
    multiple?: boolean;
    onComplete?: (selectedIds: string[], selectedExercises?: Exercise[]) => void;
    ref?: React.Ref<ExerciseSelectHandle>;
    search?: string;
}

export default function ExerciseSelect(props: ExerciseSelectProps) {
    const {multiple = true, onComplete, search: initialSearch = '', ref} = props;

    const [search, setSearch] = useState(initialSearch);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [exercisesMap, setExercisesMap] = useState<Record<string, Exercise>>({});
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);
    const [recentExerciseIds, setRecentExerciseIds] = useLocalStorage<string[]>({
        key: 'recent-exercise-ids',
        defaultValue: [],
    });

    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const onSearchChangeDebounced = useDebouncedCallback(setSearch, 300);

    // Fetch muscles for the filter dropdown
    const {data: musclesData} = useListMuscles({});
    const muscles: Muscle[] = useMemo(() => musclesData?.data || [], [musclesData?.data]);

    // Fetch exercises with filters
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
        per_page: 20,
        search: search || undefined,
        muscle_ids: selectedMuscleIds.length > 0 ? selectedMuscleIds : undefined,
    });

    const exercises = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data?.pages]);

    // Infinite scroll using native IntersectionObserver to properly observe within the scrollable container
    useEffect(() => {
        const loadMoreElement = loadMoreRef.current;
        const listElement = listRef.current;

        // Don't set up observer if:
        // - Elements aren't mounted yet
        // - No more pages to load
        // - Currently fetching
        // - No exercises loaded yet (prevents immediate triggering on first render)
        if (!loadMoreElement || !listElement || !hasNextPage || isFetchingNextPage || exercises.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting) {
                    fetchNextPage();
                }
            },
            {
                root: listElement,
                threshold: 0.1,
                rootMargin: '0px',
            },
        );

        // Small delay to ensure the DOM has settled after render
        const timeoutId = setTimeout(() => {
            observer.observe(loadMoreElement);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, exercises.length]);

    // Get recent exercises from the loaded data
    const recentExercises = useMemo((): Exercise[] => {
        if (!recentExerciseIds.length) return [];
        return recentExerciseIds
            .slice(0, 3)
            .map((id) => exercisesMap[id])
            .filter((exercise): exercise is Exercise => exercise !== undefined);
    }, [recentExerciseIds, exercisesMap]);

    // Update exercises map when exercises change
    useEffect(() => {
        setExercisesMap((prev) => {
            const newMap = {...prev};
            exercises.forEach((exercise) => {
                newMap[exercise.id] = exercise;
            });
            return newMap;
        });
    }, [exercises]);

    // Reset focus when search changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [search, selectedMuscleIds]);

    const handleSelect = useCallback(
        (id: string) => {
            // Update recent exercises
            setRecentExerciseIds((prev) => {
                const filtered = prev.filter((prevId) => prevId !== id);
                return [id, ...filtered].slice(0, 10);
            });

            // For single-select mode, immediately call onComplete
            if (!multiple) {
                const selectedExercise = exercisesMap[id];
                onComplete?.([id], selectedExercise ? [selectedExercise] : undefined);
                return;
            }

            // For multi-select mode, toggle the selection
            setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
            );
        },
        [multiple, onComplete, exercisesMap, setRecentExerciseIds],
    );

    const handleSave = useCallback(() => {
        const selectedExercises = selectedIds
            .map((id) => exercisesMap[id])
            .filter((exercise): exercise is Exercise => exercise !== undefined);
        onComplete?.(selectedIds, selectedExercises);
    }, [selectedIds, exercisesMap, onComplete]);

    useImperativeHandle(ref, () => ({
        handleSave,
    }));

    const handleToggleMuscle = (muscleId: string) => {
        setSelectedMuscleIds((prev) =>
            prev.includes(muscleId) ? prev.filter((id) => id !== muscleId) : [...prev, muscleId],
        );
    };

    const handleClearMuscleFilters = () => {
        setSelectedMuscleIds([]);
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (exercises.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.min(prev + 1, exercises.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    if (focusedIndex >= 0 && focusedIndex < exercises.length) {
                        const focusedExercise = exercises[focusedIndex];
                        if (focusedExercise) {
                            e.preventDefault();
                            handleSelect(focusedExercise.id);
                        }
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setFocusedIndex(-1);
                    searchInputRef.current?.focus();
                    break;
            }
        },
        [exercises, focusedIndex, handleSelect],
    );

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'ArrowDown' && exercises.length > 0) {
                e.preventDefault();
                setFocusedIndex(0);
            } else if (e.key === 'Enter' && exercises.length > 0 && focusedIndex === -1) {
                const firstExercise = exercises[0];
                if (firstExercise) {
                    e.preventDefault();
                    handleSelect(firstExercise.id);
                }
            } else if (e.key === 'Escape') {
                setSearch('');
                onSearchChangeDebounced('');
            }
        },
        [exercises, focusedIndex, handleSelect, onSearchChangeDebounced],
    );

    return (
        <>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
                className={classes.container}
                onKeyDown={handleKeyDown}
            >
                {/* Search Section */}
                <div className={classes.searchSection}>
                    <div className={classes.searchInputWrapper}>
                        <TextInput
                            onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search exercises..."
                            ref={searchInputRef}
                            rightSection={
                                isLoading ? (
                                    <Loader
                                        color="blue"
                                        size="xs"
                                    />
                                ) : search ? (
                                    <button
                                        aria-label="Clear search"
                                        onClick={() => {
                                            setSearch('');
                                            onSearchChangeDebounced('');
                                            searchInputRef.current?.focus();
                                        }}
                                        style={{background: 'none', border: 'none', cursor: 'pointer', padding: 4}}
                                        type="button"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                ) : null
                            }
                            size="md"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className={classes.quickFilters}>
                        {/* Muscle Filter Dropdown */}
                        <Menu
                            closeOnItemClick={false}
                            position="bottom-start"
                            shadow="md"
                            width={220}
                        >
                            <Menu.Target>
                                <button
                                    className={`${classes.muscleFilterButton} ${selectedMuscleIds.length > 0 ? classes.muscleFilterButtonActive : ''}`}
                                    type="button"
                                >
                                    <IconBarbell size={14} />
                                    <span>Muscles</span>
                                    {selectedMuscleIds.length > 0 && (
                                        <span className={classes.muscleCount}>{selectedMuscleIds.length}</span>
                                    )}
                                    <IconChevronDown size={14} />
                                </button>
                            </Menu.Target>

                            <Menu.Dropdown>
                                {selectedMuscleIds.length > 0 && (
                                    <>
                                        <Menu.Item
                                            color="red"
                                            onClick={handleClearMuscleFilters}
                                        >
                                            Clear all filters
                                        </Menu.Item>
                                        <Menu.Divider />
                                    </>
                                )}
                                {muscles.map((muscle) => (
                                    <Menu.Item
                                        key={muscle.id}
                                        leftSection={
                                            selectedMuscleIds.includes(muscle.id) ? (
                                                <CheckIcon
                                                    size={14}
                                                    weight="bold"
                                                />
                                            ) : (
                                                <span style={{width: 14}} />
                                            )
                                        }
                                        onClick={() => handleToggleMuscle(muscle.id)}
                                    >
                                        {muscle.name}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>

                        <button
                            className={classes.createButton}
                            onClick={() => {
                                // TODO: Open create exercise drawer
                            }}
                            type="button"
                        >
                            <IconPlus size={14} />
                            <span>New</span>
                        </button>

                        {multiple && selectedIds.length > 0 && (
                            <div className={classes.selectionBadge}>
                                <CheckIcon
                                    size={12}
                                    weight="bold"
                                />
                                <span>{selectedIds.length}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Exercises Section */}
                {!search && selectedMuscleIds.length === 0 && recentExercises.length > 0 && (
                    <div className={classes.recentSection}>
                        <div className={classes.sectionHeader}>
                            <IconHistory size={14} />
                            <span>Recent</span>
                        </div>
                        <div className={classes.recentList}>
                            {recentExercises.map((exercise) => (
                                <button
                                    className={`${classes.recentChip} ${selectedIds.includes(exercise.id) ? classes.recentChipSelected : ''}`}
                                    key={exercise.id}
                                    onClick={() => handleSelect(exercise.id)}
                                    type="button"
                                >
                                    <span className={classes.recentChipName}>{exercise.name}</span>
                                    {exercise.muscles && exercise.muscles.length > 0 && exercise.muscles[0] && (
                                        <span className={classes.recentChipMeta}>{exercise.muscles[0].name}</span>
                                    )}
                                    {selectedIds.includes(exercise.id) && (
                                        <CheckIcon
                                            size={12}
                                            weight="bold"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Exercise List */}
                {isLoading && exercises.length === 0 ? (
                    <div className={classes.loadingContainer}>
                        <Loader
                            color="blue"
                            size="md"
                        />
                        <span className={classes.loadingText}>Loading exercises...</span>
                    </div>
                ) : exercises.length === 0 ? (
                    <div className={classes.emptyState}>
                        <Text className={classes.emptyStateText}>
                            {search
                                ? `No exercises found for "${search}"`
                                : selectedMuscleIds.length > 0
                                  ? 'No exercises found for selected muscles'
                                  : 'No exercises yet'}
                        </Text>
                        {selectedMuscleIds.length > 0 && (
                            <button
                                className={classes.clearFilterButton}
                                onClick={handleClearMuscleFilters}
                                type="button"
                            >
                                Clear filters
                            </button>
                        )}
                        <button
                            className={`${classes.createButton} ${classes.emptyStateAction}`}
                            onClick={() => {
                                // TODO: Open create exercise drawer
                            }}
                            type="button"
                        >
                            <IconPlus size={16} />
                            <span>Create your first exercise</span>
                        </button>
                    </div>
                ) : (
                    <div
                        aria-label="Exercise list"
                        className={classes.exerciseList}
                        ref={listRef}
                        role="listbox"
                    >
                        {exercises.map((exercise, idx) => (
                            <ExerciseCard
                                exercise={exercise}
                                focused={focusedIndex === idx}
                                isSelected={selectedIds.includes(exercise.id)}
                                key={exercise.id}
                                onSelect={() => handleSelect(exercise.id)}
                            />
                        ))}

                        {/* Infinite scroll trigger */}
                        {hasNextPage && (
                            <div
                                className={classes.loadMoreTrigger}
                                ref={loadMoreRef}
                            >
                                {isFetchingNextPage && (
                                    <Loader
                                        color="blue"
                                        size="sm"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Keyboard hint - only show when actively navigating */}
                {exercises.length > 0 && focusedIndex >= 0 && (
                    <Text
                        c="dimmed"
                        className={classes.searchHint}
                        size="xs"
                    >
                        ↑↓ navigate • Enter select • Esc cancel
                    </Text>
                )}
            </div>
        </>
    );
}
