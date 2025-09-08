import {ActionIcon, Box, Card, Center, Group, Stack, Text, Title} from '@mantine/core';
import {CaretRightIcon} from '@phosphor-icons/react';
import {useNavigate} from 'react-router';

import {CONTENT_TYPE_CONFIG} from '@/components/Configs.tsx';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

export default function LibraryPage() {
    const navigate = useNavigate();

    const onSelect = (value: string) => {
        navigate(`/contents?type=${value}`);
    };

    return (
        <PagePaper>
            <HeadingContainer
                style={{paddingBlock: 'var(--ce-size-sm)', paddingInline: 'var(--ce-size-lg)'}}
                withBorder={false}
            >
                <Stack
                    gap="xs"
                    style={{flex: 1}}
                >
                    <Title order={5}>Library</Title>
                    <Text
                        c={'dark.6'}
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            fontWeight: 400,
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Manage and curate all exercises, foods, techniques, activities, guides, and lessons.
                    </Text>
                </Stack>
            </HeadingContainer>
            <PaddingContainer
                paddingX={'lg'}
                paddingY={'md'}
                style={{marginTop: 'var(--ce-size-md)'}}
            >
                <Stack mb="md">
                    {Object(CONTENT_TYPE_CONFIG)
                        .keys()
                        .map((key) => {
                            const config = CONTENT_TYPE_CONFIG[key];
                            const IconComponent = config.icon;

                            return (
                                <Card
                                    aria-label={`Select ${config.label}: ${config.description}`}
                                    key={config.value}
                                    onClick={() => onSelect(config.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelect(config.value);
                                        }
                                    }}
                                    role="button"
                                    style={{
                                        borderRadius: 'var(--body-offset)',
                                        cursor: 'pointer',
                                        paddingBottom: 'var(--ce-size-md)',
                                        paddingInline: 'var(--ce-size-md)',
                                        paddingTop: 'var(--body-offset)',
                                    }}
                                    tabIndex={0}
                                    withBorder
                                >
                                    <Group
                                        align="center"
                                        justify="space-between"
                                        wrap={'nowrap'}
                                    >
                                        <Group
                                            gap={'md'}
                                            style={{flex: 1, minWidth: 0}}
                                            wrap={'nowrap'}
                                        >
                                            <Center
                                                h={48}
                                                style={{
                                                    backgroundColor: config.color || 'var(--mantine-color-brand-1)',
                                                    borderRadius: 12,
                                                    flexShrink: 0,
                                                }}
                                                w={48}
                                            >
                                                <IconComponent
                                                    color={config.iconColor || 'var(--mantine-color-brand-6)'}
                                                    size={24}
                                                />
                                            </Center>
                                            <Box style={{flex: 1, gap: 0, minWidth: 0}}>
                                                <Text
                                                    c={'dark'}
                                                    style={{
                                                        color: 'var(--mantine-color-gray-9)',
                                                        fontSize: 'var(--body-font-size)',
                                                        fontWeight: 600,
                                                        lineHeight: 'var(--body-line-height)',
                                                    }}
                                                >
                                                    {config.label}
                                                </Text>
                                                <Text
                                                    c={'dark'}
                                                    style={{
                                                        color: 'var(--mantine-color-gray-9)',
                                                        fontSize: 'var(--callout-font-size)',
                                                        fontWeight: 400,
                                                        lineHeight: 'var(--callout-line-height)',
                                                    }}
                                                >
                                                    {config.description}
                                                </Text>
                                            </Box>
                                        </Group>

                                        <ActionIcon
                                            color={'gray'}
                                            size={'lg'}
                                            style={{flexShrink: 0}}
                                            variant={'subtle'}
                                        >
                                            <CaretRightIcon size={20} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            );
                        })}
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
}
