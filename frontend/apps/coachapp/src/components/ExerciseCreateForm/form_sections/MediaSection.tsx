import {closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ActionIcon, Badge, Box, Group, Image, Stack, Text, useMantineTheme} from '@mantine/core';
import {Dropzone, FileWithPath, IMAGE_MIME_TYPE} from '@mantine/dropzone';
import {IconCloudUpload, IconGripVertical, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

interface SortableImageProps {
    id: string;
    index: number;
    onRemove: (index: number) => void;
    theme: any;
    url: string;
}

const SortableImage = ({id, url, index, onRemove, theme}: SortableImageProps) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <Box
            ref={setNodeRef}
            style={{...style, position: 'relative'}}
        >
            <Box
                style={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                }}
            >
                <Image
                    alt={`preview-${index}`}
                    radius="md"
                    src={url}
                    style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        border: `1px solid ${theme.colors.gray[3]}`,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.gray[0],
                        display: 'block',
                    }}
                />
                <Badge
                    color="blue"
                    radius="xl"
                    size="sm"
                    style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                    }}
                    variant="filled"
                >
                    {index + 1}
                </Badge>
                <Box
                    {...attributes}
                    {...listeners}
                    style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        cursor: 'grab',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: theme.radius.sm,
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <IconGripVertical
                        color={theme.colors.gray[7]}
                        size={16}
                    />
                </Box>
                <ActionIcon
                    color="red"
                    onClick={() => onRemove(index)}
                    radius="xl"
                    size="sm"
                    style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                    }}
                    variant="filled"
                >
                    <IconX size={14} />
                </ActionIcon>
            </Box>
        </Box>
    );
};

const MediaSection = () => {
    const theme = useMantineTheme();

    const [files, setFiles] = useState<FileWithPath[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Generate blob URLs whenever files change
    useEffect(() => {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));

        // Create new blob URLs for current files
        const newUrls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls(newUrls);

        // Cleanup on unmount or when files change again
        return () => {
            newUrls.forEach((url) => URL.revokeObjectURL(url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleRemoveImage = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragEnd = (event: any) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex((_, idx) => `image-${idx}` === active.id);
                const newIndex = items.findIndex((_, idx) => `image-${idx}` === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <Box
            style={{
                borderRadius: theme.radius.lg,
                border: `1px dashed ${theme.colors.gray[4]}`,
                padding: theme.spacing.sm,
            }}
        >
            <Dropzone
                accept={IMAGE_MIME_TYPE}
                maxSize={5 * 1024 ** 2}
                multiple
                onDrop={(accepted) => {
                    // Append to preserve upload order across multiple drops
                    setFiles((prev) => [...prev, ...accepted]);
                }}
                onReject={(rejected) => {
                    // eslint-disable-next-line no-console
                    console.log('Files rejected', rejected);
                }}
            >
                <Stack
                    align="center"
                    gap="xs"
                    p="md"
                >
                    <IconCloudUpload size={28} />
                    <Text
                        c="dimmed"
                        size="sm"
                        ta="center"
                    >
                        Add images to illustrate exercise instructions. The order you upload them will be the order
                        displayed to your client.
                    </Text>
                    <Text
                        c="dimmed"
                        size="xs"
                        ta="center"
                    >
                        Drag and drop or click to select files. You can reorder later if needed.
                    </Text>
                </Stack>
            </Dropzone>

            {previewUrls.length > 0 && (
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                >
                    <SortableContext items={previewUrls.map((_, idx) => `image-${idx}`)}>
                        <Group
                            gap="sm"
                            justify="flex-start"
                            mt="md"
                            wrap="wrap"
                        >
                            {previewUrls.map((url, idx) => (
                                <SortableImage
                                    id={`image-${idx}`}
                                    index={idx}
                                    key={`image-${idx}`}
                                    onRemove={handleRemoveImage}
                                    theme={theme}
                                    url={url}
                                />
                            ))}
                        </Group>
                    </SortableContext>
                </DndContext>
            )}
        </Box>
    );
};

export default MediaSection;
