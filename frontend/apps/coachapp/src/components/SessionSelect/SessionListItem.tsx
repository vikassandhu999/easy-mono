import {ActionIcon, Box, Card, Center, Group, Text} from '@mantine/core';
import {IconCheck, IconPlus} from '@tabler/icons-react';

import {Session} from '@/api/sessions';

import {getSessionTypeConfig} from '../PlanBuilder/sessionTypes';

interface SessionListItemProps {
    isSelected?: boolean;
    onToggle: (id: string) => void;
    session: Session;
}

export default function SessionListItem({isSelected, onToggle, session}: SessionListItemProps) {
    const typeConfig = getSessionTypeConfig(session.session_type);
    const IconComponent = typeConfig.icon;

    const handleClick = () => {
        onToggle(session.id);
    };

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${session.name}: ${session.description || typeConfig.description}`}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            p="sm"
            radius="md"
            role="button"
            styles={{
                root: {
                    '&:hover': {
                        borderColor: isSelected ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-gray-4)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                    },
                    backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-white)',
                    borderColor: isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-3)',
                    cursor: 'pointer',
                    transform: 'translateY(0)',
                    transition: 'all 0.1s ease',
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="center"
                gap="sm"
                wrap="nowrap"
            >
                <Center
                    h={36}
                    style={{
                        backgroundColor: typeConfig.color,
                        borderRadius: 6,
                        flexShrink: 0,
                    }}
                    w={36}
                >
                    <IconComponent
                        color={typeConfig.iconColor}
                        size={18}
                    />
                </Center>
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        fw={isSelected ? 700 : 600}
                        lineClamp={1}
                        size="sm"
                        style={{
                            color: isSelected ? 'var(--mantine-color-blue-8)' : 'var(--mantine-color-gray-9)',
                        }}
                    >
                        {session.name}
                    </Text>
                    {(session.description || typeConfig.description) && (
                        <Text
                            c={isSelected ? 'blue.6' : 'dimmed'}
                            lineClamp={1}
                            size="xs"
                        >
                            {session.description || typeConfig.description}
                        </Text>
                    )}
                </Box>
                <Center>
                    <ActionIcon
                        color={isSelected ? 'blue' : 'gray'}
                        radius="md"
                        size="md"
                        variant={isSelected ? 'filled' : 'light'}
                    >
                        {isSelected ? <IconCheck size={16} /> : <IconPlus size={16} />}
                    </ActionIcon>
                </Center>
            </Group>
        </Card>
    );
}
