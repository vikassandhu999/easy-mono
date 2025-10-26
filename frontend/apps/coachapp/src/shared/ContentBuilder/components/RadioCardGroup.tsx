import {Box, Group, Radio, Text} from '@mantine/core';

/**
 * RadioCardGroup - Reusable radio button group with card styling
 *
 * Provides consistent styling for radio groups across all content forms.
 * Uses CSS Grid for responsive layout that wraps cleanly on mobile.
 */

export interface RadioCardOption {
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
            <Box
                mt="xs"
                style={{
                    display: 'grid',
                    gap: 'var(--mantine-spacing-xs)',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                }}
            >
                {options.map((option) => {
                    return (
                        <Radio.Card
                            key={option.value}
                            p="sm"
                            radius="lg"
                            value={option.value}
                        >
                            <Group
                                gap="sm"
                                style={{minWidth: 0}}
                                wrap="nowrap"
                            >
                                <Radio.Indicator
                                    radius={9999}
                                    style={{flexShrink: 0}}
                                />
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
                        </Radio.Card>
                    );
                })}
            </Box>
        </Radio.Group>
    );
}
