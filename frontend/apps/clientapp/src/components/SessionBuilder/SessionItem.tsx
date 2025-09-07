import {useState} from 'react';
import {Box, Group, Text, Badge, ActionIcon, Stack, Card, Collapse, Divider} from '@mantine/core';
import {DotsSixVerticalIcon, PencilIcon, TrashIcon, CaretDownIcon, CaretUpIcon} from '@phosphor-icons/react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {SessionDefItemConfig} from '@/Api/SessionDefs';
import EditableFields from './EditableFields';

interface SessionItemProps {
    item: SessionDefItemConfig;
    index: number;
    isEditing?: boolean;
    onEdit?: () => void;
    onSave?: (updatedItem: SessionDefItemConfig) => void;
    onCancel?: () => void;
    onDelete?: () => void;
    isDragDisabled?: boolean;
}

function SessionItemContent({item, index}: {item: SessionDefItemConfig; index: number}) {
    const {content} = item;

    return (
        <>
            <Group
                gap={'xs'}
                align="center"
                mb={'xs'}
            >
                <Text
                    size="sm"
                    fw={500}
                    c="dark"
                    style={{
                        fontSize: 'var(--body-font-size)',
                        lineHeight: 'var(--body-line-height)',
                        color: 'var(--mantine-color-gray-9)',
                        flex: 1,
                    }}
                >
                    {index + 1}. {content?.name || 'Unknown Content'}
                </Text>
                <Badge
                    size="xs"
                    variant="light"
                    color="blue"
                    radius={'var(--body-offset)'}
                >
                    {content?.type || 'content'}
                </Badge>
            </Group>

            {content?.description && (
                <Text
                    size="xs"
                    c="dimmed"
                    lineClamp={2}
                    mb={'xs'}
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
                        size="xs"
                        variant="outline"
                        radius={'var(--body-offset)'}
                    >
                        {item.sets_count} sets
                    </Badge>
                )}
                {item.rest_seconds > 0 && (
                    <Badge
                        size="xs"
                        variant="outline"
                        color="orange"
                        radius={'var(--body-offset)'}
                    >
                        {item.rest_seconds}s rest
                    </Badge>
                )}
                {content?.duration && (
                    <Badge
                        size="xs"
                        variant="outline"
                        color="green"
                        radius={'var(--body-offset)'}
                    >
                        {content.duration}min
                    </Badge>
                )}
                {item.custom_instructions && (
                    <Badge
                        size="xs"
                        variant="outline"
                        color="yellow"
                        radius={'var(--body-offset)'}
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
                        size="xs"
                        fw={500}
                        c="dimmed"
                        mb={4}
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Instructions:
                    </Text>
                    <Text
                        size="xs"
                        c="dark"
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
                        size="xs"
                        fw={500}
                        c="dimmed"
                        mb={4}
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Custom Notes:
                    </Text>
                    <Text
                        size="xs"
                        c="dark"
                        fs="italic"
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

function SessionItemActions({
    isEditing,
    showDetails,
    onToggleDetails,
    onEdit,
    onDelete,
}: {
    isEditing: boolean;
    showDetails: boolean;
    onToggleDetails: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    if (isEditing) return null;

    return (
        <Group
            gap={'xs'}
            p={'sm'}
            align="center"
            justify={'space-between'}
        >
            <Group>
                <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="sm"
                    onClick={onEdit}
                >
                    <PencilIcon size={24} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={onDelete}
                >
                    <TrashIcon size={24} />
                </ActionIcon>
            </Group>

            <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={onToggleDetails}
            >
                {showDetails ? <CaretUpIcon size={24} /> : <CaretDownIcon size={24} />}
            </ActionIcon>
        </Group>
    );
}

export default function SessionItem({
    item,
    index,
    isEditing = false,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    isDragDisabled = false,
}: SessionItemProps) {
    const [showDetails, setShowDetails] = useState(false);

    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: item.content_id,
        disabled: isDragDisabled || isEditing,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
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
            ref={setNodeRef}
            style={style}
            radius={'var(--body-offset)'}
            p={'sm'}
            className={isDragging ? 'dragging' : ''}
        >
            <Stack gap={'sm'}>
                <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                >
                    {/* Drag Handle */}
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        style={{cursor: isDragDisabled || isEditing ? 'default' : 'grab'}}
                        {...attributes}
                        {...listeners}
                    >
                        <DotsSixVerticalIcon size={16} />
                    </ActionIcon>

                    {/* Content */}
                    <Box style={{flex: 1, minWidth: 0}}>
                        <SessionItemContent
                            item={item}
                            index={index}
                        />
                        {/* Actions */}
                        <SessionItemActions
                            isEditing={isEditing}
                            showDetails={showDetails}
                            onToggleDetails={handleToggleDetails}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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
                            onSave={onSave}
                            onCancel={onCancel}
                        />
                    </>
                )}
            </Stack>
        </Card>
    );
}
