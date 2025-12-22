import type {MantineRadius, MantineSpacing} from '@mantine/core';

import {Card, Group, Stack, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';
import React from 'react';

export type ActionListCardProps = {
    label: string;
    description?: string;
    icon: React.ReactNode;
    onClick: () => void;

    disabled?: boolean;

    withChevron?: boolean;
    radius?: MantineRadius;
    padding?: MantineSpacing;
    withBorder?: boolean;
    danger: boolean;
    ariaLabel?: string;
};

export default function ({
    label,
    description,
    icon,
    onClick,
    disabled = false,
    withChevron = true,
    radius = 'lg',
    padding = 'md',
    withBorder = true,
    ariaLabel,
    danger = false,
}: ActionListCardProps) {
    const theme = useMantineTheme();

    return (
        <UnstyledButton
            aria-disabled={disabled || undefined}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={onClick}
            style={{width: '100%'}}
        >
            <Card
                padding={padding}
                radius={radius}
                style={{
                    width: '100%',
                    borderColor: danger ? theme.colors.red['5'] : '',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'background-color 120ms ease, border-color 120ms ease',
                    outline: 0,
                }}
                withBorder={withBorder}
            >
                <Group
                    align="center"
                    justify="space-between"
                    wrap="nowrap"
                >
                    <Group
                        align="center"
                        gap="md"
                        style={{minWidth: 0}}
                        wrap="nowrap"
                    >
                        {icon}
                        <Stack
                            gap={2}
                            style={{flex: 1, minWidth: 0}}
                        >
                            <Text
                                c={danger ? 'red' : ''}
                                fw={600}
                                truncate
                            >
                                {label}
                            </Text>
                            {description ? (
                                <Text
                                    c="dimmed"
                                    size="sm"
                                    truncate
                                >
                                    {description}
                                </Text>
                            ) : null}
                        </Stack>
                    </Group>

                    {withChevron ? <IconChevronRight size={16} /> : null}
                </Group>
            </Card>
        </UnstyledButton>
    );
}
