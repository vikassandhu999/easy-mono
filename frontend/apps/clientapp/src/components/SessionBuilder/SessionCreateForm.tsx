import {CreateSessionDef, SessionType} from '@/Api/SessionDefs';
import {Stack, TextInput, NumberInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {FixedBottom} from '../Containers/FixedBottom';
import {SESSION_TYPE_CONFIG} from '../ScheduleBuilder/sessionTypeConfig';
import PaddingContainer from '../Containers/PaddingContainer';

interface SessionCreateFormProps {
    sessionType: SessionType;
    onSubmit: (values: CreateSessionDef) => Promise<void>;
}

export default function SessionCreateForm({sessionType, onSubmit}: SessionCreateFormProps) {
    const typeConfig = SESSION_TYPE_CONFIG[sessionType] || SESSION_TYPE_CONFIG.other;

    const form = useForm<CreateSessionDef>({
        initialValues: {
            name: '',
            description: '',
            session_type: sessionType,
            duration_minutes: 30,
        },
        validate: {
            name: (value) => (!value || value.trim().length === 0 ? 'Name is required' : null),
            duration_minutes: (value) => {
                if (!value || value < 1) return 'Duration must be at least 1 minute';
                if (value > 480) return 'Duration cannot exceed 480 minutes (8 hours)';
                return null;
            },
        },
    });

    return (
        <PaddingContainer
            paddingX={'sm'}
            paddingY={'lg'}
        >
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap={'md'}>
                    <TextInput
                        label="Name"
                        placeholder={`Enter ${typeConfig.label.toLowerCase()} name`}
                        required
                        {...form.getInputProps('name')}
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />

                    {/* Duration */}
                    <NumberInput
                        label="Duration (minutes)"
                        placeholder="30"
                        min={1}
                        max={480}
                        {...form.getInputProps('duration_minutes')}
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />

                    <FixedBottom
                        isSubmitting={form.submitting}
                        label={`Create ${typeConfig.label}`}
                    />
                </Stack>
            </form>
        </PaddingContainer>
    );
}
