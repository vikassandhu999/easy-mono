import {Button, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {PlusIcon} from '@phosphor-icons/react';
import React from 'react';
import {useNavigate} from 'react-router';

import HeadingContainer from '@/components/containers/HeaderContainer';
import Header from '@/components/layouts/Header';

type ContentsListHeaderProps = {
    onCreateContent?: () => void;
    onSearchChange?: (search: string) => void;
    ref?: React.Ref<HTMLDivElement>;
    title?: string;
};

export default function ContentsListHeader({onCreateContent, onSearchChange, ref, title}: ContentsListHeaderProps) {
    const navigate = useNavigate();
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
                <Header
                    actions={
                        <Button
                            leftSection={<PlusIcon size={18} />}
                            onClick={onCreateContent}
                            radius={9999}
                            size={'sm'}
                        >
                            Create
                        </Button>
                    }
                    onBack={() => navigate(-1)}
                    title={title || 'Programs'}
                />
                <TextInput
                    m={0}
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search contents..."
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
