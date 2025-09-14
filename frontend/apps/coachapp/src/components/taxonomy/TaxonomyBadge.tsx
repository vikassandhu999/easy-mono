import {Box, Group, Stack, Text} from '@mantine/core';
import React from 'react';

import {CONTENT_TYPE_CONFIG} from '@/components/Configs';

export type TaxonomyColorKey = 'gray' | keyof typeof CONTENT_TYPE_CONFIG;

interface TaxonomyBadgeProps {
    // Back-compat alias used in some views
    color?: TaxonomyColorKey;
    colorKey?: TaxonomyColorKey;
    compact?: boolean;
    icon: React.ComponentType<any>;
    label?: string;
    value: React.ReactNode;
}

export function TaxonomyBadge({icon, label, value, color, colorKey = 'gray', compact = false}: TaxonomyBadgeProps) {
    const IconComp = icon;
    const effectiveKey = colorKey ?? color ?? 'gray';
    const cfg = (CONTENT_TYPE_CONFIG as any)[effectiveKey] || {
        color: 'var(--mantine-color-gray-1)',
        iconColor: 'var(--mantine-color-gray-6)',
    };

    return (
        <Box
            style={{
                backgroundColor: cfg.color,
                padding: compact ? '4px 8px' : '6px 10px',
                borderRadius: 8,
                border: `1px solid ${cfg.iconColor}`,
            }}
        >
            <Group
                align="center"
                gap="xs"
                wrap="nowrap"
            >
                <IconComp
                    color={cfg.iconColor}
                    size={16}
                />
                {label ? (
                    <Stack
                        gap={2}
                        justify="center"
                    >
                        <Text
                            c="dimmed"
                            fw={500}
                            size="xs"
                            style={{lineHeight: 1}}
                        >
                            {label}
                        </Text>
                        <Text
                            fw={600}
                            size="sm"
                            style={{lineHeight: 1.2}}
                        >
                            {value}
                        </Text>
                    </Stack>
                ) : (
                    <Text
                        fw={600}
                        size="sm"
                    >
                        {value}
                    </Text>
                )}
            </Group>
        </Box>
    );
}
