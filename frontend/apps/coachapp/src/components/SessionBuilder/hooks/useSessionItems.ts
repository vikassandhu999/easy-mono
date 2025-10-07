import {notifications} from '@mantine/notifications';
import {useCallback, useState} from 'react';

import {SessionItemConfig} from '@/api/sessions';
import {useUpdateSessionItemsMutation} from '@/store/services/sessionsApi';

interface UseSessionItemsProps {
    initialItems: SessionItemConfig[];
    onItemsUpdate?: (items: SessionItemConfig[]) => void;
    sessionId: string;
}

export function useSessionItems({initialItems, onItemsUpdate, sessionId}: UseSessionItemsProps) {
    const [items, setItems] = useState<SessionItemConfig[]>(initialItems);
    const [updateSessionItems, {isLoading: isUpdating}] = useUpdateSessionItemsMutation();

    const updateItems = useCallback(
        async (newItems: SessionItemConfig[]) => {
            const previousItems = items;
            setItems(newItems);

            try {
                const sanitizedItems = newItems.map((item) => {
                    const rest = {...item};
                    delete rest.content;
                    return rest;
                });
                await updateSessionItems({id: sessionId, data: {items: sanitizedItems}}).unwrap();
                onItemsUpdate?.(newItems);
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
        [items, onItemsUpdate, sessionId, updateSessionItems],
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
                rest_seconds: 0,
                sets: 1,
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
