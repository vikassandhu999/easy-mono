import React from 'react';
import {Card, Group, Stack, Text, UnstyledButton, useMantineTheme} from '@mantine/core';
import type { MantineRadius, MantineSpacing} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';

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
    danger: boolean,
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
    danger = false
}: ActionListCardProps) {

  const theme = useMantineTheme();

    return (
        <UnstyledButton
            onClick={onClick}
            disabled={disabled}
            aria-disabled={disabled || undefined}
            aria-label={ariaLabel}
            style={{width: '100%'}}
        >
            <Card
                withBorder={withBorder}
                radius={radius}
                padding={padding}
                style={{
                    width: '100%',
                    borderColor : danger ?  theme.colors.red["5"] :'',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'background-color 120ms ease, border-color 120ms ease',
                    outline: 0,
                }}
            >
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" align="center" wrap="nowrap" style={{minWidth: 0}}>
                        {icon}
                        <Stack gap={2} style={{flex: 1, minWidth: 0}} >
                            <Text fw={600} truncate c={danger ? "red" : ""}>
                                {label}
                            </Text>
                            {description ? (
                                <Text size="sm" c="dimmed" truncate >
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
