import React, {useState} from 'react';
import {
    Box,
    Text,
    Button,
    Group,
    Stack,
    Grid,
    Card,
    Center,
    ActionIcon,
    Transition,
    InputLabel,
    rem,
    useMantineTheme,
    InputDescription,
} from '@mantine/core';
import {IconChevronDown, IconEdit} from '@tabler/icons-react';

export interface OptionItem {
    value: string;
    label: string;
    icon: React.ComponentType<any>;
    description: string;
    color?: string;
    iconColor?: string;
}

interface OptionSelectorProps {
    /** The current selected value */
    value?: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Array of available options */
    options: OptionItem[];
    /** Label for the selector */
    label: string;

    hideLabel?: boolean;
    /** Placeholder text when no option is selected */
    placeholder?: string;
    /** Number of columns in the grid */
    columns?: number;
    /** Optional description */
    description?: string;
}

/**
 * A creative option selector component that shows options in a grid format.
 * Follows the UX/UI guidelines with proper spacing, visual hierarchy, and accessibility.
 *
 * Features:
 * - Grid-based option display for scalability
 * - On-demand reveal/hide of options
 * - Clear visual states (selected, hover, focus)
 * - Accessibility compliant
 * - Reusable for different option types
 */
export const OptionSelector: React.FC<OptionSelectorProps> = ({
    value,
    onChange,
    options,
    label,
    hideLabel = false,
    columns = 3,
    description,
}) => {
    const theme = useMantineTheme();
    const [isExpanded, setIsExpanded] = useState(!value);

    const selectedOption = options.find((option) => option.value === value);

    const handleOptionSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsExpanded(false);
    };

    const handleChangeClick = () => {
        setIsExpanded(true);
    };

    const renderSelectedOption = () => {
        if (!selectedOption) return null;

        const IconComponent = selectedOption.icon;

        return (
            <Card
                withBorder
                p="xs"
                style={{
                    borderRadius: 8,
                    transition: 'all 200ms ease',
                }}
                styles={{
                    root: {
                        '&:hover': {
                            borderColor: 'var(--mantine-color-blue-4)',
                            backgroundColor: 'var(--mantine-color-blue-0)',
                        },
                    },
                }}
            >
                <Group
                    justify="space-between"
                    align="center"
                    wrap={'nowrap'}
                >
                    <Group
                        gap={'xs'}
                        wrap={'nowrap'}
                    >
                        <Center
                            w={48}
                            h={48}
                            style={{
                                backgroundColor: selectedOption.color || 'var(--mantine-color-blue-1)',
                                borderRadius: 8,
                            }}
                        >
                            <IconComponent size={24} />
                        </Center>
                        <Box flex={1}>
                            <Text
                                fw={600}
                                size="sm"
                            >
                                {selectedOption.label}
                            </Text>
                            <Text
                                size="xs"
                                c="dimmed"
                                mt={2}
                                style={{lineHeight: 1.4}}
                            >
                                {selectedOption.description}
                            </Text>
                        </Box>
                    </Group>

                    <Button
                        onClick={handleChangeClick}
                        c="blue"
                        size="compact-xs"
                        variant="light"
                    >
                        Change
                    </Button>

                    {/* <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="lg"
                        onClick={handleChangeClick}
                        styles={{
                            root: {
                                borderRadius: 8,
                                '&:hover': {
                                    backgroundColor: 'var(--mantine-color-blue-1)',
                                },
                            },
                        }}
                        aria-label={`Change ${label.toLowerCase()}`}
                    >
                    </ActionIcon> */}
                </Group>
            </Card>
        );
    };

    const renderOptions = () => {
        return (
            <Stack gap="xs">
                {/* Header with collapse option when option is selected */}
                {selectedOption && (
                    <Group
                        justify={'end'}
                        align="center"
                    >
                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={
                                <IconChevronDown
                                    size={14}
                                    style={{
                                        transform: 'rotate(180deg)',
                                        transition: 'transform 200ms ease',
                                    }}
                                />
                            }
                            onClick={() => setIsExpanded(false)}
                        >
                            Collapse
                        </Button>
                    </Group>
                )}

                {/* Options Grid */}
                <Grid gutter="sm">
                    {options.map((option) => {
                        const IconComponent = option.icon;
                        const isSelected = option.value === value;

                        return (
                            <Grid.Col
                                key={option.value}
                                span={{
                                    base: 12,
                                    sm: 12 / Math.min(2, columns),
                                    md: 12 / columns,
                                }}
                            >
                                <Card
                                    withBorder
                                    p={'xs'}
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: 8,
                                        transition: 'all 200ms ease',
                                        borderColor: isSelected
                                            ? 'var(--mantine-color-blue-4)'
                                            : 'var(--mantine-color-gray-3)',
                                        backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                    styles={{
                                        root: {
                                            '&:hover': {
                                                borderColor: 'var(--mantine-color-blue-4)',
                                                backgroundColor: isSelected
                                                    ? 'var(--mantine-color-blue-1)'
                                                    : 'var(--mantine-color-blue-0)',
                                                transform: 'scale(1.02)',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                            },
                                        },
                                    }}
                                    onClick={() => handleOptionSelect(option.value)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOptionSelect(option.value);
                                        }
                                    }}
                                    aria-pressed={isSelected}
                                    aria-label={`Select ${option.label}: ${option.description}`}
                                >
                                    <Group
                                        justify="space-between"
                                        align="center"
                                        wrap={'nowrap'}
                                    >
                                        <Group
                                            gap={'xs'}
                                            wrap={'nowrap'}
                                        >
                                            <Center
                                                w={48}
                                                h={48}
                                                style={{
                                                    backgroundColor: option.color || 'var(--mantine-color-blue-1)',
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <IconComponent size={24} />
                                            </Center>
                                            <Box flex={1}>
                                                <Text
                                                    fw={600}
                                                    size="sm"
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text
                                                    size="xs"
                                                    c="dimmed"
                                                    mt={2}
                                                    style={{lineHeight: 1.4}}
                                                >
                                                    {option.description}
                                                </Text>
                                            </Box>
                                        </Group>
                                    </Group>
                                </Card>
                            </Grid.Col>
                        );
                    })}
                </Grid>
            </Stack>
        );
    };

    return (
        <Stack gap="sm">
            {/* Label and Description */}
            <Box>
                {!hideLabel && (
                    <InputLabel
                        styles={{
                            label: {
                                fontSize: rem(14),
                                fontWeight: 700,
                                color: theme.colors.gray[8],
                                marginBottom: rem(description ? 4 : 0),
                            },
                        }}
                    >
                        {label}
                    </InputLabel>
                )}
                {description && (
                    <InputDescription
                        size={'md'}
                        c="dimmed"
                        style={{lineHeight: 1.4}}
                    >
                        {description}
                    </InputDescription>
                )}
            </Box>

            {/* Selected Option or Placeholder */}
            {!isExpanded && selectedOption ? (
                <Transition
                    mounted={!isExpanded && !!selectedOption}
                    transition="slide-down"
                    duration={200}
                    timingFunction="ease"
                >
                    {(styles) => <div style={styles}>{renderSelectedOption()}</div>}
                </Transition>
            ) : !isExpanded && !selectedOption ? (
                <Card
                    withBorder
                    p="md"
                    style={{
                        borderRadius: 8,
                        borderStyle: 'dashed',
                        borderColor: 'var(--mantine-color-gray-4)',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                    }}
                    styles={{
                        root: {
                            '&:hover': {
                                borderColor: 'var(--mantine-color-blue-4)',
                                backgroundColor: 'var(--mantine-color-blue-0)',
                            },
                        },
                    }}
                    onClick={() => setIsExpanded(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsExpanded(true);
                        }
                    }}
                    aria-label={`Select ${label.toLowerCase()}`}
                >
                    <Group
                        justify={'end'}
                        align={'center'}
                    >
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                        >
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Group>
                </Card>
            ) : null}

            {/* Options Grid */}
            <Transition
                mounted={isExpanded}
                transition="slide-down"
                duration={300}
                timingFunction="ease"
            >
                {(styles) => <div style={styles}>{renderOptions()}</div>}
            </Transition>
        </Stack>
    );
};
