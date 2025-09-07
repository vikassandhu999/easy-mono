import {Button, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {PlusIcon} from '@phosphor-icons/react';
import HeadingContainer from '@/components/containers/HeaderContainer';
import React from 'react';
import Header from '@/components/layouts/Header';
import {useNavigate} from 'react-router';

type ContentsListHeaderProps = {
    onSearchChange?: (search: string) => void;
    onCreateContent?: () => void;
    title?: string;
    ref?: React.Ref<HTMLDivElement>;
};

export default function ContentsListHeader({onSearchChange, onCreateContent, title, ref}: ContentsListHeaderProps) {
    const navigate = useNavigate();
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
                <Header
                    title={title || 'Programs'}
                    onBack={() => navigate(-1)}
                    actions={
                        <Button
                            size={'sm'}
                            radius={9999}
                            onClick={onCreateContent}
                            leftSection={<PlusIcon size={18} />}
                        >
                            Create
                        </Button>
                    }
                />
                <TextInput
                    placeholder="Search contents..."
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    size={'md'}
                    m={0}
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
