import {Box, Group, Text, useMantineTheme} from '@mantine/core';

interface InfoRowProps {
    icon: React.ComponentType<{size?: number | string}>;
    label: string;
    value?: string;
    withoutBorder?: boolean;
}

export const InfoRow = ({icon: Icon, label, value, withoutBorder}: InfoRowProps) => {
    const theme = useMantineTheme();

    if (!value) return null;

    return (
        <Group
            gap="md"
            py="sm"
            style={{
                borderBottom: withoutBorder ? 'none' : `1px solid ${theme.colors.gray[2]}`,
            }}
            wrap="nowrap"
        >
            <Box
                c="gray.6"
                component="span"
            >
                <Icon size={18} />
            </Box>
            <Box style={{flex: 1}}>
                <Text
                    c="dimmed"
                    size="xs"
                >
                    {label}
                </Text>
                <Text
                    fw={500}
                    size="sm"
                >
                    {value}
                </Text>
            </Box>
        </Group>
    );
};
