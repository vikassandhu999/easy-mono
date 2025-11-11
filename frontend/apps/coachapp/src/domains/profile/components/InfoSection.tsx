import {Group, Stack, Text} from '@mantine/core';
import {FC, ReactNode} from 'react';

interface InfoSectionProps {
    icon?: ReactNode;
    label: string;
    placeholder?: string;
    value: ReactNode;
}

const InfoSection: FC<InfoSectionProps> = ({label, value, icon, placeholder}) => {
    const displayValue = value || placeholder;
    const isEmpty = !value && placeholder;

    return (
        <Stack gap="xs">
            <Text
                c="dimmed"
                fw={600}
                size="sm"
            >
                {label}
            </Text>
            {icon ? (
                <Group
                    align="center"
                    gap="xs"
                >
                    {icon}
                    <Text
                        c={isEmpty ? 'dimmed' : undefined}
                        fs={isEmpty ? 'italic' : undefined}
                        size="sm"
                    >
                        {displayValue}
                    </Text>
                </Group>
            ) : (
                <Text
                    c={isEmpty ? 'dimmed' : undefined}
                    fs={isEmpty ? 'italic' : undefined}
                    size="sm"
                >
                    {displayValue}
                </Text>
            )}
        </Stack>
    );
};

export default InfoSection;
