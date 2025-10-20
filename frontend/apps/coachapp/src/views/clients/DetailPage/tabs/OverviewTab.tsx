import {Badge, Card, Group, Stack, Text} from '@mantine/core';
import {format, parseISO} from 'date-fns';

import {Client} from '@/store/services/clients';

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
                padding="lg"
                radius="xl"
                withBorder
            >
                <Text
                    fw={600}
                    mb="md"
                    size="md"
                >
                    Membership
                </Text>
                <Stack gap="sm">
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Status
                        </Text>
                        <Badge
                            color={MEMBERSHIP_STATUS_COLOR[client.membership_status] ?? 'gray'}
                            radius="xl"
                            size="xs"
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
                                Start date
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
                                End date
                            </Text>
                            <Text size="sm">{format(parseISO(client.membership_end_date), 'MMM dd, yyyy')}</Text>
                        </Group>
                    )}
                </Stack>
            </Card>

            {client.assigned_coach && (
                <Card
                    padding="lg"
                    radius="xl"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="md"
                        size="md"
                    >
                        Coach
                    </Text>
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Assigned coach
                        </Text>
                        <Text size="sm">{client.assigned_coach.name}</Text>
                    </Group>
                </Card>
            )}

            {client.notes && (
                <Card
                    padding="lg"
                    radius="xl"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="md"
                        size="md"
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
