import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ActionIcon, Badge, Box, Card, Collapse, Divider, Group, Stack, Text} from '@mantine/core';
import {CaretDownIcon, CaretUpIcon, DotsSixVerticalIcon, PencilIcon, TrashIcon} from '@phosphor-icons/react';
import {useState} from 'react';

import {SessionDefItemConfig} from '@/api/session_defs.ts';

import EditableFields from './EditableFields';

interface SessionItemProps {
    index: number;
    isDragDisabled?: boolean;
    isEditing?: boolean;
    item: SessionDefItemConfig;
    onCancel?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    onSave?: (updatedItem: SessionDefItemConfig) => void;
}

export default function SessionItem({
    index,
    isDragDisabled = false,
    isEditing = false,
    item,
    onCancel,
    onDelete,
    onEdit,
    onSave,
}: SessionItemProps) {
    const [showDetails, setShowDetails] = useState(false);

    const {attributes, isDragging, listeners, setNodeRef, transform, transition} = useSortable({
        disabled: isDragDisabled || isEditing,
        id: item.content_id,
    });

    const style = {
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleEdit = () => {
        onEdit?.();
    };

    const handleDelete = () => {
        onDelete?.();
    };

    const handleToggleDetails = () => {
        setShowDetails(!showDetails);
    };

    return (
        <Card
            className={isDragging ? 'dragging' : ''}
            p={'sm'}
            radius={'var(--body-offset)'}
            ref={setNodeRef}
            style={style}
        >
            <Stack gap={'sm'}>
                <Group
                    align="flex-start"
                    justify="space-between"
                    wrap="nowrap"
                >
                    {/* Drag Handle */}
                    <ActionIcon
                        color="gray"
                        size="lg"
                        style={{cursor: isDragDisabled || isEditing ? 'default' : 'grab'}}
                        variant="subtle"
                        {...attributes}
                        {...listeners}
                    >
                        <DotsSixVerticalIcon size={16} />
                    </ActionIcon>

                    {/* Content */}
                    <Box style={{flex: 1, minWidth: 0}}>
                        <SessionItemContent
                            index={index}
                            item={item}
                        />
                        {/* Actions */}
                        <SessionItemActions
                            isEditing={isEditing}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onToggleDetails={handleToggleDetails}
                            showDetails={showDetails}
                        />
                    </Box>
                </Group>

                {/* Details Section */}
                <Collapse in={showDetails && !isEditing}>
                    <Divider mb={'sm'} />
                    <SessionItemDetails item={item} />
                </Collapse>

                {/* Editing Mode */}
                {isEditing && onSave && onCancel && (
                    <>
                        <Divider />
                        <EditableFields
                            item={item}
                            onCancel={onCancel}
                            onSave={onSave}
                        />
                    </>
                )}
            </Stack>
        </Card>
    );
}

function SessionItemActions({
    isEditing,
    onDelete,
    onEdit,
    onToggleDetails,
    showDetails,
}: {
    isEditing: boolean;
    onDelete?: () => void;
    onEdit?: () => void;
    onToggleDetails: () => void;
    showDetails: boolean;
}) {
    if (isEditing) return null;

    return (
        <Group
            align="center"
            gap={'xs'}
            justify={'space-between'}
            p={'sm'}
        >
            <Group>
                <ActionIcon
                    color="blue"
                    onClick={onEdit}
                    size="sm"
                    variant="subtle"
                >
                    <PencilIcon size={24} />
                </ActionIcon>
                <ActionIcon
                    color="red"
                    onClick={onDelete}
                    size="sm"
                    variant="subtle"
                >
                    <TrashIcon size={24} />
                </ActionIcon>
            </Group>

            <ActionIcon
                color="gray"
                onClick={onToggleDetails}
                size="sm"
                variant="subtle"
            >
                {showDetails ? <CaretUpIcon size={24} /> : <CaretDownIcon size={24} />}
            </ActionIcon>
        </Group>
    );
}

function SessionItemContent({index, item}: {index: number; item: SessionDefItemConfig}) {
    const {content} = item;

    return (
        <>
            <Group
                align="center"
                gap={'xs'}
                mb={'xs'}
            >
                <Text
                    c="dark"
                    fw={500}
                    size="sm"
                    style={{
                        color: 'var(--mantine-color-gray-9)',
                        flex: 1,
                        fontSize: 'var(--body-font-size)',
                        lineHeight: 'var(--body-line-height)',
                    }}
                >
                    {index + 1}. {content?.name || 'Unknown Content'}
                </Text>
                <Badge
                    color="blue"
                    radius={'var(--body-offset)'}
                    size="xs"
                    variant="light"
                >
                    {content?.type || 'content'}
                </Badge>
            </Group>

            {content?.description && (
                <Text
                    c="dimmed"
                    lineClamp={2}
                    mb={'xs'}
                    size="xs"
                    style={{
                        fontSize: 'var(--callout-font-size)',
                        lineHeight: 'var(--callout-line-height)',
                    }}
                >
                    {content.description}
                </Text>
            )}

            <Group
                gap={'xs'}
                wrap="wrap"
            >
                {item.sets_count > 0 && (
                    <Badge
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {item.sets_count} sets
                    </Badge>
                )}
                {item.rest_seconds > 0 && (
                    <Badge
                        color="orange"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {item.rest_seconds}s rest
                    </Badge>
                )}
                {content?.duration && (
                    <Badge
                        color="green"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        {content.duration}min
                    </Badge>
                )}
                {item.custom_instructions && (
                    <Badge
                        color="yellow"
                        radius={'var(--body-offset)'}
                        size="xs"
                        variant="outline"
                    >
                        Has notes
                    </Badge>
                )}
            </Group>
        </>
    );
}

function SessionItemDetails({item}: {item: SessionDefItemConfig}) {
    const {content} = item;

    return (
        <Stack gap={'xs'}>
            {content?.instructions && (
                <Box>
                    <Text
                        c="dimmed"
                        fw={500}
                        mb={4}
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Instructions:
                    </Text>
                    <Text
                        c="dark"
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        {content.instructions}
                    </Text>
                </Box>
            )}
            {item.custom_instructions && (
                <Box>
                    <Text
                        c="dimmed"
                        fw={500}
                        mb={4}
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Custom Notes:
                    </Text>
                    <Text
                        c="dark"
                        fs="italic"
                        size="xs"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        {item.custom_instructions}
                    </Text>
                </Box>
            )}
        </Stack>
    );
}
