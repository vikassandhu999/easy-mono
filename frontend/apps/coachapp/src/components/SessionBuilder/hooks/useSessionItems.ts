import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useCallback, useState} from 'react';

import {SessionDefItemConfig, SessionDefsAPI} from '@/api/session_defs.ts';

interface UseSessionItemsProps {
    initialItems: SessionDefItemConfig[];
    onItemsUpdate?: (items: SessionDefItemConfig[]) => void;
    sessionDefId: string;
}

export function useSessionItems({initialItems, onItemsUpdate, sessionDefId}: UseSessionItemsProps) {
    const [items, setItems] = useState<SessionDefItemConfig[]>(initialItems);
    const queryClient = useQueryClient();

    const updateItemsMutation = useMutation({
        mutationFn: async (updatedItems: SessionDefItemConfig[]) => {
            const result = await SessionDefsAPI.updateSessionDef(sessionDefId, {items: updatedItems});
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: 'Failed to update session items',
                title: 'Error',
            });
            console.error('Failed to update session items:', error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['sessiondef', sessionDefId]});
            onItemsUpdate?.(items);
        },
    });

    const updateItems = useCallback(
        (newItems: SessionDefItemConfig[]) => {
            setItems(newItems);
            updateItemsMutation.mutate(newItems);
        },
        [updateItemsMutation],
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
        (contentId: string, updates: Partial<SessionDefItemConfig>) => {
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
            const newItems: SessionDefItemConfig[] = contentIds.map((contentId, index) => ({
                content_id: contentId,
                custom_instructions: '',
                display_order: items.length + index + 1,
                rest_seconds: 0,
                sets_count: 1,
            }));

            const allItems = [...items, ...newItems];
            updateItems(allItems);
        },
        [items, updateItems],
    );

    return {
        addItems,
        deleteItem,
        isLoading: updateItemsMutation.isPending,
        items,
        reorderItems,
        updateItem,
    };
}
