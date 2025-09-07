import {Button, Group, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import HeadingContainer from '@/components/containers/HeaderContainer';
import React from 'react';
import {IconMailShare} from '@tabler/icons-react';

type PlansPageProps = {
    onSearchChange?: (search: string) => void;
    isLoading?: boolean;
    ref?: React.Ref<HTMLDivElement>;
    onInviteClick?: () => void;
};

export default function Header({onSearchChange, ref, onInviteClick}: PlansPageProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    return (
        <HeadingContainer
            ref={ref}
            style={{
                paddingInline: 'var(--ce-size-lg)',
                paddingBlock: 'var(--ce-size-md)',
            }}
        >
            <Stack gap="md">
                <Group
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    w="100%"
                >
                    <Stack
                        gap="0"
                        style={{flex: 1}}
                    >
                        <Title order={5}>Clients</Title>
                    </Stack>

                    <Button
                        size={'sm'}
                        radius={9999}
                        onClick={onInviteClick}
                        leftSection={<IconMailShare size={18} />}
                    >
                        Invite
                    </Button>
                </Group>

                <TextInput
                    placeholder="Search clients..."
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    size={'md'}
                    styles={{
                        root: {flex: 1},
                        input: {
                            borderRadius: 'var(--body-offset)',
                        },
                    }}
                />
            </Stack>
        </HeadingContainer>
    );
}
