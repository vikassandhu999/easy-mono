import {Button, Group, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconUserPlus} from '@tabler/icons-react';
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
                        leftSection={<IconUserPlus size={18} />}
                        onClick={onInviteClick}
                        radius="md"
                        size={'sm'}
                    >
                        Add a client
                    </Button>
                </Group>

                <TextInput
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search clients..."
                    radius="md"
                    size={'md'}
                    styles={{
                        root: {flex: 1},
                    }}
                    variant="filled"
                />
            </Stack>
        </HeadingContainer>
    );
}
