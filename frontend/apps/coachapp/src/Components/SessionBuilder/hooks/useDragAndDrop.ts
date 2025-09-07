import {useState, useCallback} from 'react';
import {
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {restrictToVerticalAxis} from '@dnd-kit/modifiers';
import {SessionDefItemConfig} from '@/Api/SessionDefs';

interface UseDragAndDropProps {
    items: SessionDefItemConfig[];
    onReorder: (oldIndex: number, newIndex: number) => void;
    disabled?: boolean;
}

export function useDragAndDrop({items, onReorder, disabled = false}: UseDragAndDropProps) {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const {active, over} = event;
            setActiveId(null);

            if (active.id !== over?.id && !disabled) {
                const oldIndex = items.findIndex((item) => item.content_id === active.id);
                const newIndex = items.findIndex((item) => item.content_id === over?.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    onReorder(oldIndex, newIndex);
                }
            }
        },
        [items, onReorder, disabled],
    );

    const activeItem = activeId ? items.find((item) => item.content_id === activeId) : null;

    const dragContextProps = {
        sensors,
        collisionDetection: closestCenter,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        modifiers: [restrictToVerticalAxis],
    };

    const sortableContextProps = {
        items: items.map((item) => item.content_id),
        strategy: 'vertical' as const,
    };

    return {
        activeItem,
        activeId,
        dragContextProps,
        sortableContextProps,
    };
}
