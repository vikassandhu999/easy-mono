import {ActionIcon, Avatar, Box, Card, Center, Group, Text} from '@mantine/core';
import {IconBarbell, IconBowlChopsticks, IconCheck, IconPlus} from '@tabler/icons-react';
import React from 'react';

import {Session} from '@/services/session';
import {assignColorByToken} from '@/utils/ui';

export interface PlanSessionLisItemProps {
    isSelected?: boolean;
    multiple?: boolean;
    onToggle: (id: string) => void;
    session: Session;
}

export default function PlanSessionListItem({isSelected, onToggle, session, multiple}: PlanSessionLisItemProps) {
    const sessionColor = assignColorByToken(session.id);
    const IconComponent = session.session_type === 'meal' ? IconBowlChopsticks : IconBarbell;

    const handleClick = () => {
        onToggle(session.id);
    };

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${session.name}: ${session.description || 'Meal session'}`}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            p="sm"
            radius="xl"
            role="button"
            style={{
                backgroundColor: isSelected
                    ? `color-mix(in srgb, var(--mantine-color-blue-0) 50%, white)`
                    : 'var(--mantine-color-white)',
                borderColor: isSelected ? `var(--mantine-color-blue-4)` : 'var(--mantine-color-gray-3)',
                cursor: 'pointer',
                transform: 'translateY(0)',
                transition: 'all 0.1s ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        borderColor: isSelected ? `var(--mantine-color-blue-5)` : 'var(--mantine-color-gray-4)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                    },
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
                <Avatar
                    color={sessionColor}
                    radius="xl"
                    size={36}
                    variant="light"
                >
                    {React.createElement(IconComponent, {size: 18})}
                </Avatar>
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        c={'gray.9'}
                        fw={isSelected ? 700 : 600}
                        lineClamp={1}
                        size="sm"
                    >
                        {session.name}
                    </Text>
                    {session.description && (
                        <Text
                            c={'dimmed'}
                            lineClamp={1}
                            size="xs"
                        >
                            {session.description}
                        </Text>
                    )}
                </Box>
                <Center>
                    {multiple && (
                        <ActionIcon
                            color={isSelected ? 'blue' : 'gray'}
                            radius="xl"
                            size="md"
                            variant={isSelected ? 'filled' : 'light'}
                        >
                            {isSelected ? <IconCheck size={16} /> : <IconPlus size={16} />}
                        </ActionIcon>
                    )}
                </Center>
            </Group>
        </Card>
    );
}
