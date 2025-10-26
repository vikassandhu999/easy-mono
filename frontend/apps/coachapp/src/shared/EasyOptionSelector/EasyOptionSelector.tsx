import {
    ActionIcon,
    Box,
    Button,
    Card,
    Center,
    Grid,
    Group,
    InputDescription,
    InputLabel,
    InputWrapper,
    Stack,
    Text,
    Transition,
} from '@mantine/core';
import {IconChevronDown} from '@tabler/icons-react';
import React, {useState} from 'react';

export interface EasyOptionSelectorProps {
    /** Number of columns in the grid */
    columns?: number;
    /** Optional description */
    description?: string;
    hideLabel?: boolean;
    /** Label for the selector */
    label: string;

    /** Callback when value changes */
    onChange: (value: string) => void;
    /** Array of available options */
    options: OptionItem[];
    /** Placeholder text when no option is selected */
    placeholder?: string;
    /** The current selected value */
    value?: string;
}

export interface OptionItem {
    color?: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor?: string;
    label: string;
    value: string;
}
const EasyOptionSelector: React.FC<EasyOptionSelectorProps> = ({
    columns = 3,
    description,
    label,
    onChange,
    options,
    value,
}) => {
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
                p="xs"
                style={{
                    borderRadius: 8,
                    transition: 'all 200ms ease',
                }}
                styles={{
                    root: {
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-blue-0)',
                            borderColor: 'var(--mantine-color-blue-4)',
                        },
                    },
                }}
                withBorder
            >
                <Group
                    align="center"
                    justify="space-between"
                    wrap={'nowrap'}
                >
                    <Group
                        gap={'xs'}
                        wrap={'nowrap'}
                    >
                        <Center
                            h={48}
                            style={{
                                backgroundColor: selectedOption.color || 'var(--mantine-color-blue-1)',
                                borderRadius: 8,
                            }}
                            w={48}
                        >
                            <IconComponent size={24} />
                        </Center>
                        <Box flex={1}>
                            <InputLabel size={'md'}>{selectedOption.label}</InputLabel>
                            <InputDescription size={'md'}>{selectedOption.description}</InputDescription>
                        </Box>
                    </Group>

                    <Button
                        c="blue"
                        onClick={handleChangeClick}
                        size="compact-xs"
                        variant="light"
                    >
                        Change
                    </Button>
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
                        align="center"
                        justify={'end'}
                    >
                        <Button
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
                            size="xs"
                            variant="subtle"
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
                                    md: 12 / columns,
                                    sm: 12 / Math.min(2, columns),
                                }}
                            >
                                <Card
                                    aria-label={`Select ${option.label}: ${option.description}`}
                                    aria-pressed={isSelected}
                                    onClick={() => handleOptionSelect(option.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOptionSelect(option.value);
                                        }
                                    }}
                                    p={'xs'}
                                    role="button"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                                        borderColor: isSelected
                                            ? 'var(--mantine-color-blue-4)'
                                            : 'var(--mantine-color-gray-3)',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        transition: 'all 200ms ease',
                                    }}
                                    styles={{
                                        root: {
                                            '&:hover': {
                                                backgroundColor: isSelected
                                                    ? 'var(--mantine-color-blue-1)'
                                                    : 'var(--mantine-color-blue-0)',
                                                borderColor: 'var(--mantine-color-blue-4)',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                transform: 'scale(1.02)',
                                            },
                                        },
                                    }}
                                    tabIndex={0}
                                    withBorder
                                >
                                    <Group
                                        align="center"
                                        justify="space-between"
                                        wrap={'nowrap'}
                                    >
                                        <Group
                                            gap={'xs'}
                                            wrap={'nowrap'}
                                        >
                                            <Center
                                                h={48}
                                                style={{
                                                    backgroundColor: option.color || 'var(--mantine-color-blue-1)',
                                                    borderRadius: 8,
                                                }}
                                                w={48}
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
                                                    c="dimmed"
                                                    mt={2}
                                                    size="xs"
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
        <InputWrapper
            description={description}
            label={label}
            py={'sm'}
            size={'md'}
        >
            {!isExpanded && selectedOption ? (
                <Transition
                    duration={200}
                    mounted={!isExpanded && !!selectedOption}
                    timingFunction="ease"
                    transition="slide-down"
                >
                    {(styles) => <div style={styles}>{renderSelectedOption()}</div>}
                </Transition>
            ) : !isExpanded && !selectedOption ? (
                <Card
                    aria-label={`Select ${label.toLowerCase()}`}
                    onClick={() => setIsExpanded(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsExpanded(true);
                        }
                    }}
                    p="md"
                    role="button"
                    style={{
                        borderColor: 'var(--mantine-color-gray-4)',
                        borderRadius: 8,
                        borderStyle: 'dashed',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                    }}
                    styles={{
                        root: {
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-blue-0)',
                                borderColor: 'var(--mantine-color-blue-4)',
                            },
                        },
                    }}
                    tabIndex={0}
                    withBorder
                >
                    <Group
                        align={'center'}
                        justify={'end'}
                    >
                        <ActionIcon
                            color="gray"
                            size="sm"
                            variant="subtle"
                        >
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Group>
                </Card>
            ) : null}

            {/* Options Grid */}
            <Transition
                duration={300}
                mounted={isExpanded}
                timingFunction="ease"
                transition="slide-down"
            >
                {(styles) => <div style={styles}>{renderOptions()}</div>}
            </Transition>
        </InputWrapper>
    );
};

export default EasyOptionSelector;
