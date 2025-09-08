import {Alert, Badge, Button, Card, Group, NumberInput, Stack, Text, Textarea} from '@mantine/core';
import {useForm} from '@mantine/form';
import {IconAlertCircle} from '@tabler/icons-react';

import {Content} from '@/api/contents.ts';
import {SessionDefItemConfig} from '@/api/session_defs.ts';

interface SessionItemFormProps {
    content: Content;
    isSubmitting?: boolean;
    onCancel: () => void;
    onSubmit: (values: SessionDefItemConfig) => Promise<void>;
}

export default function SessionItemForm({content, isSubmitting = false, onCancel, onSubmit}: SessionItemFormProps) {
    const form = useForm<Omit<SessionDefItemConfig, 'content_id'>>({
        initialValues: {
            custom_instructions: '',
            display_order: 1,
            rest_seconds: 0,
            sets_count: 1,
        },
        validate: {
            rest_seconds: (value) => (value && value < 0 ? 'Rest time cannot be negative' : null),
            sets_count: (value) => (value && value < 0 ? 'Sets cannot be negative' : null),
        },
    });

    const handleSubmit = async (values: Omit<SessionDefItemConfig, 'content_id'>) => {
        await onSubmit({
            ...values,
            content_id: content.id,
        });
    };

    const formatRestTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
                {/* Content Info */}
                <Card
                    p="md"
                    withBorder
                >
                    <Group
                        justify="space-between"
                        mb="xs"
                    >
                        <Text
                            fw={500}
                            size="md"
                        >
                            {content.name}
                        </Text>
                        <Badge
                            size="sm"
                            variant="light"
                        >
                            {content.type}
                        </Badge>
                    </Group>
                    {content.instructions && (
                        <Text
                            c="dimmed"
                            lineClamp={3}
                            size="sm"
                        >
                            {content.instructions}
                        </Text>
                    )}
                    {content.duration && (
                        <Badge
                            color="teal"
                            mt="xs"
                            size="xs"
                            variant="light"
                        >
                            {content.duration} min
                        </Badge>
                    )}
                </Card>

                <Alert
                    color="blue"
                    icon={<IconAlertCircle size={16} />}
                    variant="light"
                >
                    Configure how this content will be used in the session. You can set the number of sets, rest time,
                    and add custom instructions.
                </Alert>

                {/* Configuration Form */}
                <Stack gap="sm">
                    <NumberInput
                        description="Order in which this content appears in the session"
                        label="Display Order"
                        min={1}
                        placeholder="1"
                        {...form.getInputProps('display_order')}
                    />

                    <NumberInput
                        description="Number of sets or repetitions (0 for no specific sets)"
                        label="Sets Count"
                        min={0}
                        placeholder="1"
                        {...form.getInputProps('sets_count')}
                    />

                    <NumberInput
                        description={
                            form.values.rest_seconds
                                ? `Rest time between sets: ${formatRestTime(form.values.rest_seconds)}`
                                : 'Rest time between sets in seconds (0 for no rest)'
                        }
                        label="Rest Time (seconds)"
                        max={3600} // Max 1 hour
                        min={0}
                        placeholder="60"
                        {...form.getInputProps('rest_seconds')}
                    />

                    <Textarea
                        description="Additional instructions specific to this content in the session"
                        label="Custom Instructions"
                        maxLength={1000}
                        placeholder="e.g., Focus on form, use lighter weight, etc."
                        rows={3}
                        {...form.getInputProps('custom_instructions')}
                    />
                </Stack>

                {/* Actions */}
                <Group
                    justify="space-between"
                    mt="lg"
                >
                    <Button
                        disabled={isSubmitting}
                        onClick={onCancel}
                        variant="subtle"
                    >
                        Cancel
                    </Button>
                    <Button
                        loading={isSubmitting}
                        type="submit"
                    >
                        Add to Session
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
