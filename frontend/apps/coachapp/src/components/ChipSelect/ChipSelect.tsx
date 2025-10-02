import {Box, Chip, Group, Input, Text} from '@mantine/core';
import {useUncontrolled} from '@mantine/hooks';
import React from 'react';

export interface ChipSelectOption {
    disabled?: boolean;
    icon?: React.ComponentType<any>;
    label: string;
    value: string;
}

export interface ChipSelectProps {
    /** Data used to render options */
    data: ChipSelectOption[] | string[];
    /** Default value */
    defaultValue?: string | string[];
    /** Description displayed below the label */
    description?: React.ReactNode;
    /** Disable all chips */
    disabled?: boolean;
    /** Error message */
    error?: React.ReactNode;
    /** Label displayed above the input */
    label?: React.ReactNode;
    /** Allow multiple selection */
    multiple?: boolean;
    /** Called when value changes */
    onChange?: (value: string | string[]) => void;
    /** Chip radius */
    radius?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    /** Read only mode */
    readOnly?: boolean;
    /** Determines whether required asterisk should be rendered */
    required?: boolean;
    /** Chip size */
    size?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    /** Current selected value(s) */
    value?: string | string[];
    /** Chip variant */
    variant?: 'filled' | 'light' | 'outline';
    /** Determines whether required asterisk should be rendered */
    withAsterisk?: boolean;
}

export const ChipSelect: React.FC<ChipSelectProps> = ({
    data = [],
    value,
    defaultValue,
    onChange,
    multiple = false,
    variant = 'outline',
    size = 'md',
    radius = 'md',
    disabled = false,
    readOnly = false,
    label,
    description,
    error,
    required,
    withAsterisk,
}) => {
    const [_value, setValue] = useUncontrolled({
        value,
        defaultValue: defaultValue || (multiple ? [] : ''),
        finalValue: multiple ? [] : '',
        onChange,
    });

    // Normalize data to ChipSelectOption format
    const normalizedData: ChipSelectOption[] = data.map((item) =>
        typeof item === 'string' ? {value: item, label: item} : item,
    );

    const handleChipClick = (optionValue: string) => {
        if (disabled || readOnly) return;

        if (multiple) {
            const currentValues = Array.isArray(_value) ? _value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter((v) => v !== optionValue)
                : [...currentValues, optionValue];
            setValue(newValues);
        } else {
            setValue(_value === optionValue ? '' : optionValue);
        }
    };

    const isSelected = (optionValue: string): boolean => {
        if (multiple) {
            return Array.isArray(_value) && _value.includes(optionValue);
        }
        return _value === optionValue;
    };

    const renderChips = () => {
        return normalizedData.map((option) => {
            const IconComponent = option.icon;
            return (
                <Chip
                    checked={isSelected(option.value)}
                    disabled={disabled || option.disabled}
                    key={option.value}
                    onChange={() => handleChipClick(option.value)}
                    radius={radius}
                    size={size}
                    style={{cursor: disabled || readOnly || option.disabled ? 'not-allowed' : 'pointer'}}
                    variant={variant}
                >
                    <Group
                        gap="xs"
                        wrap="nowrap"
                    >
                        {IconComponent && <IconComponent size={16} />}
                        <span>{option.label}</span>
                    </Group>
                </Chip>
            );
        });
    };

    return (
        <Input.Wrapper
            description={description}
            error={error}
            label={label}
            required={required}
            withAsterisk={withAsterisk}
        >
            <Box>
                <Group
                    gap="xs"
                    mt={label || description ? 'xs' : 0}
                >
                    {renderChips()}
                </Group>
                {normalizedData.length === 0 && (
                    <Text
                        c="dimmed"
                        mt="xs"
                        size="sm"
                    >
                        No options available
                    </Text>
                )}
            </Box>
        </Input.Wrapper>
    );
};
