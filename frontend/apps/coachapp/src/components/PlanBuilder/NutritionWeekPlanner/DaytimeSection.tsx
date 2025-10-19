import {Box, Grid, GridCol, Stack, Text, useMantineTheme} from '@mantine/core';

import {PlanSession} from '@/store/services/plan_sessions';

import {AddSlotButton} from './AddSlotButton';
import SessionSlotCard from './SessionSlotCard';

type DaytimeSectionProps = {
    heading: string;
    onAdd: () => void;
    onAssignSession?: (planSessionId: string) => void;
    onDeleteSession: (planSessionId: string) => void;
    onEditSession?: (planSessionId: string) => void;
    planSessions: PlanSession[];
};

export function DaytimeSection({
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
            pb="md"
            style={{
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
            }}
        >
            <Grid>
                <GridCol span={{base: 12, md: 4, lg: 2}}>
                    <Text
                        c="dark.7"
                        fw={600}
                        mb={{base: 'xs', md: 0}}
                        size="sm"
                        style={{
                            lineHeight: 1.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {heading}
                    </Text>
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 10}}>
                    <Stack gap="sm">
                        {hasSessions && (
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
                        )}

                        <AddSlotButton onClick={onAdd} />
                    </Stack>
                </GridCol>
            </Grid>
        </Box>
    );
}
