import {Alert, Box, Button, Group, Stack, Text, Title} from '@mantine/core';
import {IconInfoCircle} from '@tabler/icons-react';
import {Program} from '@/Api/Programs';
import {useProgramSchedules} from '@/Hooks/useScheduleQueries';
import {useMemo} from 'react';
import {DisplayError} from '@/Components/Containers/DisplayError';
import {ScheduleCreateWithTrigger} from '@/Components/ScheduleCreateWithTrigger/ScheduleCreateWithTrigger';
import ScheduleCard from './ScheduleCard';
import {PlusIcon} from '@phosphor-icons/react';

interface ScheduleTabProps {
    programId: string;
    program: Program;
    onScheduleView: (id: string) => void;
}

export default function ScheduleTab({programId, program, onScheduleView}: ScheduleTabProps) {
    const {data, isSuccess, error} = useProgramSchedules(programId);

    const schedules = useMemo(() => {
        return data?.records || [];
    }, [data]);

    return (
        <>
            <Stack style={{gap: 'var(--ce-size-md)'}}>
                <Group
                    justify="space-between"
                    align="flex-start"
                    py="xs"
                    ml={'xs'}
                >
                    <Box style={{flex: 1}}>
                        <Title
                            order={5}
                            style={{
                                wordBreak: 'break-word',
                                color: 'var(--mantine-color-text-primary)',
                                marginBottom: 'var(--ce-size-xs)',
                                flex: 1,
                            }}
                        >
                            Schedules
                        </Title>
                        <Text
                            c="dimmed"
                            style={{
                                wordBreak: 'break-word',
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                                marginBottom: 'var(--callout-offset)',
                            }}
                        >
                            Manage training schedules for this program
                        </Text>
                    </Box>

                    <ScheduleCreateWithTrigger>
                        {({onClick}) => (
                            <Button
                                onClick={() => onClick(program)}
                                size={'md'}
                                radius={9999}
                                variant={'filled'}
                                leftSection={<PlusIcon size={16} />}
                            >
                                Create
                            </Button>
                        )}
                    </ScheduleCreateWithTrigger>
                </Group>

                <DisplayError
                    error={error}
                    codesMap={new Map()}
                />

                {/* Empty State */}
                {isSuccess && schedules.length === 0 && (
                    <Alert
                        icon={<IconInfoCircle size={16} />}
                        color="blue"
                        variant="light"
                        radius="md"
                    >
                        <Stack gap="xs">
                            <Text
                                size="sm"
                                fw={600}
                            >
                                No schedules created yet
                            </Text>
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                Create your first schedule to start organizing training sessions for this program.
                            </Text>
                        </Stack>
                    </Alert>
                )}

                {/* Schedule List */}
                {isSuccess && schedules.length > 0 && (
                    <Stack gap={'md'}>
                        {schedules.map((schedule) => (
                            <ScheduleCard
                                key={schedule.id}
                                schedule={schedule}
                                onView={() => onScheduleView(schedule.id)}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
        </>
    );
}
