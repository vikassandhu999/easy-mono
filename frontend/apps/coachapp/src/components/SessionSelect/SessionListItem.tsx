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
            role="button"
            styles={{
                root: {
                    '&:hover': {
                        borderColor: isSelected ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-gray-4)',
                        boxShadow: isSelected ? '0 4px 12px rgba(34, 139, 230, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-1px)',
                    },
                    backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-white)',
                    borderColor: isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-3)',
                    borderRadius: 'var(--body-offset)',
                    borderWidth: '1px',
                    cursor: 'pointer',
                    paddingBottom: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-md)',
                    paddingTop: 'var(--body-offset)',
                    transform: 'translateY(0)',
                    transition: 'all 0.1s ease',
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="center"
                gap="md"
                wrap="nowrap"
            >
                <Center
                    h={40}
                    style={{
                        backgroundColor: typeConfig.color,
                        borderRadius: 8,
                        flexShrink: 0,
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                    }}
                    w={40}
                >
                    <IconComponent
                        color={typeConfig.iconColor}
                        size={20}
                    />
                </Center>
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        c="dark"
                        style={{
                            color: isSelected ? 'var(--mantine-color-blue-8)' : 'var(--mantine-color-gray-9)',
                            fontSize: 'var(--body-font-size)',
                            fontWeight: isSelected ? 700 : 600,
                            lineHeight: 'var(--body-line-height)',
                            marginBottom: 'var(--ce-size-xs)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {session.name}
                    </Text>
                    {(session.description || typeConfig.description) && (
                        <Text
                            size="sm"
                            style={{
                                color: isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
                                lineHeight: 1.3,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {session.description || typeConfig.description}
                        </Text>
                    )}
                </Box>
                <Center h="100%">
                    <ActionIcon
                        color={isSelected ? 'blue' : 'gray'}
                        radius={'var(--body-offset)'}
                        size="md"
                        style={{
                            transition: 'all 0.2s ease',
                        }}
                        variant={isSelected ? 'filled' : 'light'}
                    >
                        {isSelected ? <IconCheck size={16} /> : <IconPlus size={16} />}
                    </ActionIcon>
                </Center>
            </Group>
        </Card>
    );
}
