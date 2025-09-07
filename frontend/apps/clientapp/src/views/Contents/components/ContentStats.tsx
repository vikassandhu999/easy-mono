import React from 'react';
import {Grid, Card, Group, ThemeIcon, Stack, Text} from '@mantine/core';
import {IconBook, IconEye, IconEyeOff} from '@tabler/icons-react';

interface ContentStatsProps {
    total: number;
    published: number;
    drafts: number;
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}> = ({icon, label, value, color}) => (
    <Card
        withBorder
        padding="md"
    >
        <Group>
            <ThemeIcon
                variant="light"
                color={color}
            >
                {icon}
            </ThemeIcon>
            <Stack gap={0}>
                <Text
                    fw={700}
                    size="lg"
                >
                    {value}
                </Text>
                <Text
                    size="xs"
                    c="dimmed"
                >
                    {label}
                </Text>
            </Stack>
        </Group>
    </Card>
);

export const ContentStats: React.FC<ContentStatsProps> = ({total, published, drafts}) => {
    return (
        <Grid>
            <Grid.Col span={{base: 12, xs: 4}}>
                <StatCard
                    icon={<IconBook size={18} />}
                    label="Total Content"
                    value={total}
                    color="blue"
                />
            </Grid.Col>
            <Grid.Col span={{base: 12, xs: 4}}>
                <StatCard
                    icon={<IconEye size={18} />}
                    label="Published"
                    value={published}
                    color="green"
                />
            </Grid.Col>
            <Grid.Col span={{base: 12, xs: 4}}>
                <StatCard
                    icon={<IconEyeOff size={18} />}
                    label="Drafts"
                    value={drafts}
                    color="gray"
                />
            </Grid.Col>
        </Grid>
    );
};
