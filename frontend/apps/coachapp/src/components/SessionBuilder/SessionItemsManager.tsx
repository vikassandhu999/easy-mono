import {useState} from 'react';
import {Stack, Button, Group, Text, ActionIcon, Alert, Drawer} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {restrictToVerticalAxis} from '@dnd-kit/modifiers';

import SessionItem from './SessionItem';
import {SessionDefItemConfig, ContentDetail} from '@/api/session_defs.ts';
import {useDrawerStack} from '@/providers/StackProvider';
import ContentSelect from '../ContentSelect';
import {useSessionItems} from './hooks/useSessionItems';
import {useDragAndDrop} from './hooks/useDragAndDrop';
import PaddingContainer from '@/components/containers/PaddingContainer';

interface SessionItemsManagerProps {
    sessionDefId: string;
    items: SessionDefItemConfig[];
    itemContents: ContentDetail[];
    onItemsUpdate?: (items: SessionDefItemConfig[]) => void;
    isEditable?: boolean;
}

function EmptyState({
    isEditable,
    onAddContent,
    isLoading,
}: {
    isEditable: boolean;
    onAddContent: () => void;
    isLoading: boolean;
}) {
    if (!isEditable) {
        return (
            <Alert
                color="gray"
                variant="light"
            >
                <Text
                    size="sm"
                    c="dimmed"
                    style={{
                        fontSize: 'var(--callout-font-size)',
                        lineHeight: 'var(--callout-line-height)',
                    }}
                >
                    No items added to this session yet
                </Text>
            </Alert>
        );
    }

    return (
        <Button
            variant="light"
            color="blue"
            leftSection={<PlusIcon size={16} />}
            onClick={onAddContent}
            loading={isLoading}
            fullWidth
        >
            Add Your First Item
        </Button>
    );
}

function ItemsList({
    items,
    editingItemId,
    isEditable,
    onEdit,
    onSave,
    onCancel,
    onDelete,
}: {
    items: SessionDefItemConfig[];
    editingItemId: string | null;
    isEditable: boolean;
    onEdit: (contentId: string) => void;
    onSave: (updatedItem: SessionDefItemConfig) => void;
    onCancel: () => void;
    onDelete: (contentId: string) => void;
}) {
    return (
        <Stack gap={'xs'}>
            {items.map((item, index) => (
                <SessionItem
                    key={item.content_id}
                    item={item}
                    index={index}
                    isEditing={editingItemId === item.content_id}
                    onEdit={() => onEdit(item.content_id)}
                    onSave={onSave}
                    onCancel={onCancel}
                    onDelete={() => onDelete(item.content_id)}
                    isDragDisabled={!isEditable}
                />
            ))}
        </Stack>
    );
}

export default function SessionItemsManager({
    sessionDefId,
    items: initialItems,
    onItemsUpdate,
    isEditable = true,
}: SessionItemsManagerProps) {
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const drawerStack = useDrawerStack();

    // Use custom hooks for business logic
    const {items, isLoading, reorderItems, updateItem, deleteItem, addItems} = useSessionItems({
        sessionDefId,
        initialItems,
        onItemsUpdate,
    });

    const {activeItem, dragContextProps} = useDragAndDrop({
        items,
        onReorder: reorderItems,
        disabled: !isEditable,
    });

    // Set up sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleItemEdit = (contentId: string) => {
        setEditingItemId(contentId);
    };

    const handleItemSave = (updatedItem: SessionDefItemConfig) => {
        updateItem(updatedItem.content_id, updatedItem);
        setEditingItemId(null);
    };

    const handleItemCancel = () => {
        setEditingItemId(null);
    };

    const handleAddContent = () => {
        drawerStack.open('content-picker');
    };

    const handleContentSelect = (selectedIds: string[]) => {
        addItems(selectedIds);
        drawerStack.close('content-picker');
    };

    return (
        <>
            <Stack gap={'md'}>
                {/* Header */}
                <Group
                    justify="space-between"
                    align="center"
                >
                    <Text
                        size="sm"
                        fw={500}
                        c="dark"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                            color: 'var(--mantine-color-gray-8)',
                        }}
                    >
                        Session Items ({items.length})
                    </Text>
                    {isEditable && (
                        <ActionIcon
                            variant="filled"
                            color="blue"
                            size="lg"
                            onClick={handleAddContent}
                            loading={isLoading}
                        >
                            <PlusIcon size={16} />
                        </ActionIcon>
                    )}
                </Group>

                {/* Content */}
                {items.length === 0 ? (
                    <EmptyState
                        isEditable={isEditable}
                        onAddContent={handleAddContent}
                        isLoading={isLoading}
                    />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        {...dragContextProps}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext
                            items={items.map((item) => item.content_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ItemsList
                                items={items}
                                editingItemId={editingItemId}
                                isEditable={isEditable}
                                onEdit={handleItemEdit}
                                onSave={handleItemSave}
                                onCancel={handleItemCancel}
                                onDelete={deleteItem}
                            />
                        </SortableContext>

                        <DragOverlay>
                            {activeItem && (
                                <SessionItem
                                    item={activeItem}
                                    index={0}
                                    isDragDisabled={false}
                                />
                            )}
                        </DragOverlay>
                    </DndContext>
                )}
            </Stack>

            {/* Content Picker Drawer */}
            <Drawer
                {...drawerStack.register('content-picker')}
                title="Add Content to Session"
            >
                <PaddingContainer>
                    <ContentSelect
                        onComplete={handleContentSelect}
                        onCancel={() => drawerStack.close('content-picker')}
                    />
                </PaddingContainer>
            </Drawer>
        </>
    );
}
