import {Box, Group, Text} from '@mantine/core';

import type {ContextSummaryProps} from '../PlanBuilder.types';

export function ContextSummary({icon, label}: ContextSummaryProps) {
    return (
        <Box
            bg="blue.0"
            mb="md"
            p="md"
            style={{
                border: '1px solid var(--mantine-color-blue-2)',
                borderRadius: 'var(--mantine-radius-md)',
            }}
        >
            <Group
                align="center"
                gap="sm"
                wrap="nowrap"
            >
                <Box
                    c="blue.6"
                    style={{
                        display: 'flex',
                    }}
                >
                    {icon}
                </Box>
                <Text
                    c="blue.9"
                    fw={600}
                    size="md"
                    style={{
                        lineHeight: 1.5,
                    }}
                >
                    {label}
                </Text>
            </Group>
        </Box>
    );
}
