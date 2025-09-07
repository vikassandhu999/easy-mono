import {Card, Group, Text, Center, Box, ActionIcon} from '@mantine/core';
import {IconPlus, IconCheck} from '@tabler/icons-react';
import {SESSION_TYPE_CONFIG} from '../ScheduleBuilder/sessionTypeConfig';

interface SessionDefCardProps {
    sessionDef: any;
    isSelected?: boolean;
    onToggle: (id: string) => void;
}

export default function SessionDefItem({sessionDef, onToggle, isSelected}: SessionDefCardProps) {
    const typeConfig =
        SESSION_TYPE_CONFIG[sessionDef.session_type as keyof typeof SESSION_TYPE_CONFIG] || SESSION_TYPE_CONFIG.other;
    const IconComponent = typeConfig.icon;

    const handleClick = () => {
        onToggle(sessionDef.id);
    };

    return (
        <Card
            withBorder
            styles={{
                root: {
                    cursor: 'pointer',
                    borderRadius: 'var(--body-offset)',
                    paddingTop: 'var(--body-offset)',
                    paddingInline: 'var(--ce-size-md)',
                    paddingBottom: 'var(--ce-size-md)',
                    transition: 'all 0.1s ease',
                    borderColor: isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-3)',
                    borderWidth: isSelected ? '1px' : '1px',
                    backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-white)',
                    transform: 'translateY(0)',
                    '&:hover': {
                        borderColor: isSelected ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-gray-4)',
                        transform: 'translateY(-1px)',
                        boxShadow: isSelected ? '0 4px 12px rgba(34, 139, 230, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    },
                },
            }}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${sessionDef.name}: ${sessionDef.description || typeConfig.description}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <Group
                gap="md"
                wrap="nowrap"
                align={'center'}
            >
                <Center
                    w={40}
                    h={40}
                    style={{
                        backgroundColor: typeConfig.color,
                        borderRadius: 8,
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                >
                    <IconComponent
                        size={20}
                        color={typeConfig.iconColor}
                    />
                </Center>
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        c={'dark'}
                        style={{
                            fontSize: 'var(--body-font-size)',
                            lineHeight: 'var(--body-line-height)',
                            color: isSelected ? 'var(--mantine-color-blue-8)' : 'var(--mantine-color-gray-9)',
                            fontWeight: isSelected ? 700 : 600,
                            marginBottom: 'var(--ce-size-xs)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {sessionDef.name}
                    </Text>
                    {(sessionDef.description || typeConfig.description) && (
                        <Text
                            size="sm"
                            style={{
                                color: isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
                                lineHeight: 1.3,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {sessionDef.description || typeConfig.description}
                        </Text>
                    )}
                </Box>
                <Center h={'100%'}>
                    <ActionIcon
                        variant={isSelected ? 'filled' : 'light'}
                        size={'md'}
                        radius={'var(--body-offset)'}
                        color={isSelected ? 'blue' : 'gray'}
                        style={{
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {isSelected ? <IconCheck size={16} /> : <IconPlus size={16} />}
                    </ActionIcon>
                </Center>
            </Group>
        </Card>
    );
}
