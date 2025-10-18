import {Box, Grid, GridCol, Stack, Text, useMantineTheme} from '@mantine/core';

import {PlanSession} from '@/api/plan_sessions';

import {AddSlotButton} from './AddSlotButton';
import SessionSlotCard from './SessionSlotCard';

type DaytimeSectionProps = {
    emptyMessage?: string;
    heading: string;
    onAdd: () => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    planSessions: PlanSession[];
};

export function DaytimeSection({
    emptyMessage,
    heading,
    onAdd,
    onAssignSession,
    onDeleteSession,
    onEditSession,
    planSessions,
}: DaytimeSectionProps) {
    const theme = useMantineTheme();
    const hasSessions = planSessions.length > 0;

    return (
        <Box
            pb="sm"
            style={{
                borderBottom: `1px solid ${theme.colors.gray[2]}`,
            }}
        >
            <Grid>
                <GridCol span={{base: 12, md: 4, lg: 2}}>
                    <Text
                        c="dark.8"
                        fw={600}
                        mb={{base: 'xs', md: 0}}
                        size="sm"
                        style={{
                            lineHeight: 1.4,
                        }}
                    >
                        {heading}
                    </Text>
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 10}}>
                    <Stack gap="sm">
                        {hasSessions ? (
                            <Stack gap="sm">
                                {planSessions.map((planSession) => (
                                    <SessionSlotCard
                                        key={planSession.id}
                                        onAssign={onAssignSession}
                                        onDelete={onDeleteSession}
                                        onEdit={onEditSession}
                                        planSession={planSession}
                                    />
                                ))}
                            </Stack>
                        ) : (
                            <Text
                                c="gray.5"
                                size="xs"
                                style={{
                                    fontStyle: 'italic',
                                }}
                            >
                                {emptyMessage ?? 'No sessions.'}
                            </Text>
                        )}

                        <AddSlotButton onClick={onAdd} />
                    </Stack>
                </GridCol>
            </Grid>
        </Box>
    );
}
