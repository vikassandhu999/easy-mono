import {Box, Checkbox, Group, Text} from '@mantine/core';

/**
 * CheckboxButtonGroup - Reusable checkbox group with button styling
 *
 * Provides consistent mobile-first styling for multi-select groups.
 * Uses CSS Grid for responsive layout that wraps cleanly on mobile.
 */

export interface CheckboxButtonOption {
    label: string;
    value: string;
}

export interface CheckboxButtonGroupProps {
    description?: React.ReactNode;
    label?: React.ReactNode;
    onChange?: (value: string[]) => void;
    options: CheckboxButtonOption[];
    value?: string[];
}

export function CheckboxButtonGroup({description, label, onChange, options, value = []}: CheckboxButtonGroupProps) {
    const handleChange = (optionValue: string, checked: boolean) => {
        if (!onChange) return;

        if (checked) {
            onChange([...value, optionValue]);
        } else {
            onChange(value.filter((v) => v !== optionValue));
        }
    };

    return (
        <Checkbox.Group
            description={description}
            label={label}
            value={value}
        >
            <Box
                mt="xs"
                style={{
                    display: 'grid',
                    gap: 'var(--mantine-spacing-xs)',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                }}
            >
                {options.map((option) => {
                    const isChecked = value.includes(option.value);

                    return (
                        <Checkbox.Card
                            key={option.value}
                            onClick={() => handleChange(option.value, !isChecked)}
                            p="sm"
                            radius="lg"
                            value={option.value}
                        >
                            <Group
                                gap="sm"
                                style={{minWidth: 0}}
                                wrap="nowrap"
                            >
                                <Checkbox.Indicator style={{flexShrink: 0}} />
                                <Text
                                    size="md"
                                    style={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </Group>
                        </Checkbox.Card>
                    );
                })}
            </Box>
        </Checkbox.Group>
    );
}
