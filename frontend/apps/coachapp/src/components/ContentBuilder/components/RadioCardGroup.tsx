import type {TablerIcon} from '@tabler/icons-react';

import {Group, Radio, Text} from '@mantine/core';

/**
 * RadioCardGroup - Reusable radio button group with card styling
 *
 * Provides consistent styling for radio groups across all content forms.
 * Supports optional icons for each option.
 */

export interface RadioCardOption {
    icon?: TablerIcon;
    label: string;
    value: string;
}

export interface RadioCardGroupProps {
    label?: React.ReactNode;
    onChange?: (value: string) => void;
    options: RadioCardOption[];
    value?: string;
}

export function RadioCardGroup({label, onChange, options, value}: RadioCardGroupProps) {
    return (
        <Radio.Group
            label={label}
            onChange={onChange}
            value={value ?? ''}
        >
            <Group
                gap="xs"
                mt="xs"
            >
                {options.map((option) => {
                    const Icon = option.icon;
                    return (
                        <Radio.Card
                            key={option.value}
                            p="sm"
                            radius="md"
                            value={option.value}
                        >
                            <Group wrap="nowrap">
                                <Radio.Indicator />
                                {Icon && <Icon size={16} />}
                                <Text size="sm">{option.label}</Text>
                            </Group>
                        </Radio.Card>
                    );
                })}
            </Group>
        </Radio.Group>
    );
}
