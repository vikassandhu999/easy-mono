import {Stack, Group, Text, Button, NumberInput, Textarea, Card, Badge, Alert} from '@mantine/core';
import {useForm} from '@mantine/form';
import {IconAlertCircle} from '@tabler/icons-react';
import {SessionDefItemConfig} from '@/api/session_defs.ts';
import {Content} from '@/api/contents.ts';

interface SessionItemFormProps {
    content: Content;
    onSubmit: (values: SessionDefItemConfig) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export default function SessionItemForm({content, onSubmit, onCancel, isSubmitting = false}: SessionItemFormProps) {
    const form = useForm<Omit<SessionDefItemConfig, 'content_id'>>({
        initialValues: {
            display_order: 1,
            sets_count: 1,
            custom_instructions: '',
            rest_seconds: 0,
        },
        validate: {
            sets_count: (value) => (value && value < 0 ? 'Sets cannot be negative' : null),
            rest_seconds: (value) => (value && value < 0 ? 'Rest time cannot be negative' : null),
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
                    withBorder
                    p="md"
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
                            variant="light"
                            size="sm"
                        >
                            {content.type}
                        </Badge>
                    </Group>
                    {content.instructions && (
                        <Text
                            size="sm"
                            c="dimmed"
                            lineClamp={3}
                        >
                            {content.instructions}
                        </Text>
                    )}
                    {content.duration && (
                        <Badge
                            variant="light"
                            color="teal"
                            size="xs"
                            mt="xs"
                        >
                            {content.duration} min
                        </Badge>
                    )}
                </Card>

                <Alert
                    icon={<IconAlertCircle size={16} />}
                    variant="light"
                    color="blue"
                >
                    Configure how this content will be used in the session. You can set the number of sets, rest time,
                    and add custom instructions.
                </Alert>

                {/* Configuration Form */}
                <Stack gap="sm">
                    <NumberInput
                        label="Display Order"
                        description="Order in which this content appears in the session"
                        placeholder="1"
                        min={1}
                        {...form.getInputProps('display_order')}
                    />

                    <NumberInput
                        label="Sets Count"
                        description="Number of sets or repetitions (0 for no specific sets)"
                        placeholder="1"
                        min={0}
                        {...form.getInputProps('sets_count')}
                    />

                    <NumberInput
                        label="Rest Time (seconds)"
                        description={
                            form.values.rest_seconds
                                ? `Rest time between sets: ${formatRestTime(form.values.rest_seconds)}`
                                : 'Rest time between sets in seconds (0 for no rest)'
                        }
                        placeholder="60"
                        min={0}
                        max={3600} // Max 1 hour
                        {...form.getInputProps('rest_seconds')}
                    />

                    <Textarea
                        label="Custom Instructions"
                        description="Additional instructions specific to this content in the session"
                        placeholder="e.g., Focus on form, use lighter weight, etc."
                        rows={3}
                        maxLength={1000}
                        {...form.getInputProps('custom_instructions')}
                    />
                </Stack>

                {/* Actions */}
                <Group
                    justify="space-between"
                    mt="lg"
                >
                    <Button
                        variant="subtle"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={isSubmitting}
                    >
                        Add to Session
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
