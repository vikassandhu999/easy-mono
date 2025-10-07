import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {restrictToVerticalAxis} from '@dnd-kit/modifiers';
import {SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {ActionIcon, Alert, Button, Drawer, Group, Stack, Text} from '@mantine/core';
import {PlusIcon} from '@phosphor-icons/react';
import {useState} from 'react';

import {ContentDetail, SessionItemConfig} from '@/api/sessions';
import PaddingContainer from '@/components/containers/PaddingContainer';
import {useDrawerStack} from '@/providers/StackProvider';

import ContentSelect from '../ContentSelect';
import {useDragAndDrop} from './hooks/useDragAndDrop';
import {useSessionItems} from './hooks/useSessionItems';
import SessionItem from './SessionItem';

interface SessionItemsManagerProps {
    isEditable?: boolean;
    itemContents: ContentDetail[];
    items: SessionItemConfig[];
    onItemsUpdate?: (items: SessionItemConfig[]) => void;
    sessionId: string;
}

export default function SessionItemsManager({
    isEditable = true,
    items: initialItems,
    onItemsUpdate,
    sessionId,
}: SessionItemsManagerProps) {
    const [editingItemId, setEditingItemId] = useState<null | string>(null);
    const drawerStack = useDrawerStack();

    // Use custom hooks for business logic
    const {addItems, deleteItem, isLoading, items, reorderItems, updateItem} = useSessionItems({
        initialItems,
        onItemsUpdate,
        sessionId,
    });

    const {activeItem, dragContextProps} = useDragAndDrop({
        disabled: !isEditable,
        items,
        onReorder: reorderItems,
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

    const handleItemSave = (updatedItem: SessionItemConfig) => {
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
                    align="center"
                    justify="space-between"
                >
                    <Text
                        c="dark"
                        fw={500}
                        size="sm"
                        style={{
                            color: 'var(--mantine-color-gray-8)',
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Session Items ({items.length})
                    </Text>
                    {isEditable && (
                        <ActionIcon
                            color="blue"
                            loading={isLoading}
                            onClick={handleAddContent}
                            size="lg"
                            variant="filled"
                        >
                            <PlusIcon size={16} />
                        </ActionIcon>
                    )}
                </Group>

                {/* Content */}
                {items.length === 0 ? (
                    <EmptyState
                        isEditable={isEditable}
                        isLoading={isLoading}
                        onAddContent={handleAddContent}
                    />
                ) : (
                    <DndContext
                        collisionDetection={closestCenter}
                        sensors={sensors}
                        {...dragContextProps}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext
                            items={items.map((item) => item.content_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ItemsList
                                editingItemId={editingItemId}
                                isEditable={isEditable}
                                items={items}
                                onCancel={handleItemCancel}
                                onDelete={deleteItem}
                                onEdit={handleItemEdit}
                                onSave={handleItemSave}
                            />
                        </SortableContext>

                        <DragOverlay>
                            {activeItem && (
                                <SessionItem
                                    index={0}
                                    isDragDisabled={false}
                                    item={activeItem}
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
                        onCancel={() => drawerStack.close('content-picker')}
                        onComplete={handleContentSelect}
                    />
                </PaddingContainer>
            </Drawer>
        </>
    );
}

function EmptyState({
    isEditable,
    isLoading,
    onAddContent,
}: {
    isEditable: boolean;
    isLoading: boolean;
    onAddContent: () => void;
}) {
    if (!isEditable) {
        return (
            <Alert
                color="gray"
                variant="light"
            >
                <Text
                    c="dimmed"
                    size="sm"
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
            color="blue"
            fullWidth
            leftSection={<PlusIcon size={16} />}
            loading={isLoading}
            onClick={onAddContent}
            variant="light"
        >
            Add Your First Item
        </Button>
    );
}

function ItemsList({
    editingItemId,
    isEditable,
    items,
    onCancel,
    onDelete,
    onEdit,
    onSave,
}: {
    editingItemId: null | string;
    isEditable: boolean;
    items: SessionItemConfig[];
    onCancel: () => void;
    onDelete: (contentId: string) => void;
    onEdit: (contentId: string) => void;
    onSave: (updatedItem: SessionItemConfig) => void;
}) {
    return (
        <Stack gap={'xs'}>
            {items.map((item, index) => (
                <SessionItem
                    index={index}
                    isDragDisabled={!isEditable}
                    isEditing={editingItemId === item.content_id}
                    item={item}
                    key={item.content_id}
                    onCancel={onCancel}
                    onDelete={() => onDelete(item.content_id)}
                    onEdit={() => onEdit(item.content_id)}
                    onSave={onSave}
                />
            ))}
        </Stack>
    );
}
