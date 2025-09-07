import {Text, Center, Box, Card, Group, Stack, ActionIcon} from '@mantine/core';
import {CaretRightIcon} from '@phosphor-icons/react';
import {SessionDef} from '@/Api/SessionDefs';
import {SESSION_TYPE_CONFIG} from './sessionTypeConfig';
import PaddingContainer from '../Containers/PaddingContainer';

// All supported session types are now enabled
const ENABLED_SESSION_TYPES = ['workout', 'meal', 'measurement', 'check_in'] as const;

interface SessionTypeChoice {
    onSelect: (type: SessionDef['session_type']) => void;
}

const SessionTypeChoice = ({onSelect}: SessionTypeChoice) => {
    return (
        <PaddingContainer>
            <Stack gap={'sm'}>
                {ENABLED_SESSION_TYPES.map((key) => {
                    const config = SESSION_TYPE_CONFIG[key];
                    const IconComponent = config.icon;

                    return (
                        <Card
                            key={key}
                            withBorder
                            style={{
                                cursor: 'pointer',
                                borderRadius: 'var(--body-offset)',
                                paddingTop: 'var(--body-offset)',
                                paddingInline: 'var(--ce-size-md)',
                                paddingBottom: 'var(--ce-size-md)',
                            }}
                            onClick={() => onSelect(key as any)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select ${config.label}: ${config.description}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect(key as any);
                                }
                            }}
                        >
                            <Group
                                justify="space-between"
                                align="center"
                                wrap={'nowrap'}
                            >
                                <Group
                                    gap={'md'}
                                    wrap={'nowrap'}
                                    style={{flex: 1, minWidth: 0}}
                                >
                                    <Center
                                        w={48}
                                        h={48}
                                        style={{
                                            backgroundColor: config.color || 'var(--mantine-color-brand-1)',
                                            borderRadius: 12,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <IconComponent
                                            size={24}
                                            color={config.iconColor || 'var(--mantine-color-brand-6)'}
                                        />
                                    </Center>
                                    <Box style={{flex: 1, minWidth: 0, gap: 0}}>
                                        <Text
                                            c={'dark'}
                                            style={{
                                                fontSize: 'var(--body-font-size)',
                                                lineHeight: 'var(--body-line-height)',
                                                color: 'var(--mantine-color-gray-9)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {config.label}
                                        </Text>
                                        <Text
                                            c={'dark'}
                                            style={{
                                                fontSize: 'var(--callout-font-size)',
                                                lineHeight: 'var(--callout-line-height)',
                                                color: 'var(--mantine-color-gray-9)',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {config.description}
                                        </Text>
                                    </Box>
                                </Group>

                                <ActionIcon
                                    variant={'subtle'}
                                    color={'gray'}
                                    size={'lg'}
                                    style={{flexShrink: 0}}
                                >
                                    <CaretRightIcon size={20} />
                                </ActionIcon>
                            </Group>
                        </Card>
                    );
                })}
            </Stack>
        </PaddingContainer>
    );
};

export default SessionTypeChoice;
