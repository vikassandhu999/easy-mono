import {
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {restrictToVerticalAxis} from '@dnd-kit/modifiers';
import {sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {useCallback, useState} from 'react';

import {SessionItemConfig} from '@/services/session';

interface UseDragAndDropProps {
  disabled?: boolean;
  items: SessionItemConfig[];
  onReorder: (oldIndex: number, newIndex: number) => void;
}

export function useDragAndDrop({disabled = false, items, onReorder}: UseDragAndDropProps) {
  const [activeId, setActiveId] = useState<null | UniqueIdentifier>(null);

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
    collisionDetection: closestCenter,
    modifiers: [restrictToVerticalAxis],
    onDragEnd: handleDragEnd,
    onDragStart: handleDragStart,
    sensors,
  };

  const sortableContextProps = {
    items: items.map((item) => item.content_id),
    strategy: 'vertical' as const,
  };

  return {
    activeId,
    activeItem,
    dragContextProps,
    sortableContextProps,
  };
}
