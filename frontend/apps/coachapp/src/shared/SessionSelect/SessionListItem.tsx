import {ActionIcon, Box, Card, Center, Group, Text, useMantineTheme} from '@mantine/core';
import {IconCheck, IconPlus} from '@tabler/icons-react';

import {Session} from '@/store/services/session';

import {getSessionTypeConfig} from '../PlanBuilder/sessionTypes';

interface SessionListItemProps {
    isSelected?: boolean;
    onToggle: (id: string) => void;
    session: Session;
}

export default function SessionListItem({isSelected, onToggle, session}: SessionListItemProps) {
    const theme = useMantineTheme();
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
            p="lg"
            radius={0}
            role="button"
            style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    backgroundColor: isSelected ? theme.colors.blue[0] : 'transparent',
                    '&:hover': {
                        backgroundColor: isSelected ? theme.colors.blue[0] : theme.colors.gray[0],
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                    '&:focus-visible': {
                        outline: '2px solid var(--mantine-color-brand-6)',
                        outlineOffset: '2px',
                    },
                },
            }}
            tabIndex={0}
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
                        size="md"
                        style={{
                            color: isSelected ? theme.colors.blue[8] : theme.colors.gray[9],
                        }}
                    >
                        {session.name}
                    </Text>
                    {(session.description || typeConfig.description) && (
                        <Text
                            c={isSelected ? 'blue.6' : 'dimmed'}
                            lineClamp={1}
                            size="sm"
                        >
                            {session.description || typeConfig.description}
                        </Text>
                    )}
                </Box>
                <Center style={{flexShrink: 0}}>
                    <ActionIcon
                        color={isSelected ? 'blue' : 'gray'}
                        radius="xl"
                        size="lg"
                        variant={isSelected ? 'filled' : 'light'}
                    >
                        {isSelected ? <IconCheck size={18} /> : <IconPlus size={18} />}
                    </ActionIcon>
                </Center>
            </Group>
        </Card>
    );
}
