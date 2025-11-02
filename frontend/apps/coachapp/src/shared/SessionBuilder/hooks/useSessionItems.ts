import {notifications} from '@mantine/notifications';
import {useCallback, useEffect, useState} from 'react';

import {Session, SessionItemConfig, SessionType} from '@/services/session';
import {useUpdateSessionMutation} from '@/services/session';

import {itemsToWorkoutDefinition} from '../utils';

interface UseSessionItemsProps {
    initialItems: SessionItemConfig[];
    onItemsChange?: (items: SessionItemConfig[]) => void;
    onItemsUpdate?: () => void;
    session?: Session;
    sessionType: SessionType;
}

const generateItemId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
};

export function useSessionItems({
    initialItems,
    onItemsChange,
    onItemsUpdate,
    session,
    sessionType,
}: UseSessionItemsProps) {
    const [items, setItems] = useState<SessionItemConfig[]>(initialItems);
    const [updateSession, {isLoading: isUpdating}] = useUpdateSessionMutation();
    const hasPersistedSession = Boolean(session?.id);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const updateItems = useCallback(
        async (nextItems: SessionItemConfig[]) => {
            const previousItems = items;
            setItems(nextItems);

            if (sessionType !== 'workout') {
                onItemsChange?.(nextItems);
                return;
            }

            if (!hasPersistedSession) {
                onItemsChange?.(nextItems);
                return;
            }

            try {
                const definition = itemsToWorkoutDefinition(sessionType, nextItems, session?.workout_definition);
                if (!definition) {
                    throw new Error('Workout definition must include at least one exercise');
                }

                const payload = {
                    definition,
                    workout_definition: definition,
                };

                await updateSession({id: session!.id, data: payload}).unwrap();
                onItemsChange?.(nextItems);
                onItemsUpdate?.();
            } catch (error) {
                setItems(previousItems);
                notifications.show({
                    color: 'red',
                    message: 'Failed to update session items',
                    title: 'Error',
                });
                console.error('Failed to update session items:', error);
            }
        },
        [hasPersistedSession, items, onItemsChange, onItemsUpdate, session, sessionType, updateSession],
    );

    const reorderItems = useCallback(
        (oldIndex: number, newIndex: number) => {
            const reorderedItems = [...items];
            const [movedItem] = reorderedItems.splice(oldIndex, 1);
            reorderedItems.splice(newIndex, 0, movedItem);

            // Update display_order for all items
            const updatedItems = reorderedItems.map((item, index) => ({
                ...item,
                display_order: index + 1,
            }));

            updateItems(updatedItems);
        },
        [items, updateItems],
    );

    const updateItem = useCallback(
        (contentId: string, updates: Partial<SessionItemConfig>) => {
            const updatedItems = items.map((item) => (item.content_id === contentId ? {...item, ...updates} : item));
            updateItems(updatedItems);
        },
        [items, updateItems],
    );

    const deleteItem = useCallback(
        (contentId: string) => {
            const filteredItems = items
                .filter((item) => item.content_id !== contentId)
                .map((item, index) => ({...item, display_order: index + 1}));
            updateItems(filteredItems);
        },
        [items, updateItems],
    );

    const addItems = useCallback(
        (contentIds: string[]) => {
            const newItems: SessionItemConfig[] = contentIds.map((contentId, index) => ({
                content_id: contentId,
                custom_instructions: '',
                display_order: items.length + index + 1,
                metadata: {
                    workout_exercise_id: generateItemId(),
                },
            }));

            const allItems = [...items, ...newItems];
            updateItems(allItems);
        },
        [items, updateItems],
    );

    return {
        addItems,
        deleteItem,
        isLoading: isUpdating,
        items,
        reorderItems,
        updateItem,
    };
}
