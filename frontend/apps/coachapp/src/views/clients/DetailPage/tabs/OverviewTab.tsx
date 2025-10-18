import {Badge, Card, Group, Stack, Text} from '@mantine/core';
import {format, parseISO} from 'date-fns';

import {Client} from '@/api/clients.ts';

const MEMBERSHIP_STATUS_COLOR = {
    active: 'green',
    inactive: 'gray',
    paused: 'yellow',
    expired: 'red',
};

const getMembershipStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export const ClientOverviewTab = ({client}: {client: Client}) => {
    return (
        <Stack gap="md">
            <Card
                padding="md"
                radius="xl"
                withBorder
            >
                <Text
                    fw={600}
                    mb="sm"
                    size="sm"
                >
                    Membership
                </Text>
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Status
                        </Text>
                        <Badge
                            color={MEMBERSHIP_STATUS_COLOR[client.membership_status] ?? 'gray'}
                            size="sm"
                            variant="light"
                        >
                            {getMembershipStatusLabel(client.membership_status)}
                        </Badge>
                    </Group>
                    {client.membership_start_date && (
                        <Group justify="space-between">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Start Date
                            </Text>
                            <Text size="sm">{format(parseISO(client.membership_start_date), 'MMM dd, yyyy')}</Text>
                        </Group>
                    )}
                    {client.membership_end_date && (
                        <Group justify="space-between">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                End Date
                            </Text>
                            <Text size="sm">{format(parseISO(client.membership_end_date), 'MMM dd, yyyy')}</Text>
                        </Group>
                    )}
                </Stack>
            </Card>

            {client.assigned_coach && (
                <Card
                    padding="md"
                    radius="xl"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="sm"
                        size="sm"
                    >
                        Coach
                    </Text>
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Assigned Coach
                        </Text>
                        <Text size="sm">{client.assigned_coach.name}</Text>
                    </Group>
                </Card>
            )}

            {client.notes && (
                <Card
                    padding="md"
                    radius="xl"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="sm"
                        size="sm"
                    >
                        Notes
                    </Text>
                    <Text
                        c="dimmed"
                        size="sm"
                        style={{whiteSpace: 'pre-wrap'}}
                    >
                        {client.notes}
                    </Text>
                </Card>
            )}
        </Stack>
    );
};
