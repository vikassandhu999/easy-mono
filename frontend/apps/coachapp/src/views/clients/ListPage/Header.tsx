import {Button, Group, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconMailShare} from '@tabler/icons-react';
import React from 'react';

import HeadingContainer from '@/components/containers/HeaderContainer';

type PlansPageProps = {
    isLoading?: boolean;
    onInviteClick?: () => void;
    onSearchChange?: (search: string) => void;
    ref?: React.Ref<HTMLDivElement>;
};

export default function Header({onInviteClick, onSearchChange, ref}: PlansPageProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    return (
        <HeadingContainer
            ref={ref}
            style={{
                paddingBlock: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-lg)',
            }}
        >
            <Stack gap="md">
                <Group
                    align="center"
                    justify="space-between"
                    w="100%"
                    wrap="nowrap"
                >
                    <Stack
                        gap="0"
                        style={{flex: 1}}
                    >
                        <Title order={5}>Clients</Title>
                    </Stack>

                    <Button
                        leftSection={<IconMailShare size={18} />}
                        onClick={onInviteClick}
                        radius={9999}
                        size={'sm'}
                    >
                        Invite
                    </Button>
                </Group>

                <TextInput
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search clients..."
                    size={'md'}
                    styles={{
                        input: {
                            borderRadius: 'var(--body-offset)',
                        },
                        root: {flex: 1},
                    }}
                />
            </Stack>
        </HeadingContainer>
    );
}
