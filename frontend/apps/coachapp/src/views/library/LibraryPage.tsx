import {Center, ScrollArea, SegmentedControl, Stack, Text, Title} from '@mantine/core';
import React from 'react';

import {CONTENT_TYPE_CONFIG} from '@/components/Configs.tsx';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

import ExerciseListPage from './exercise/ExerciseListPage';
import RecipeListPage from './recipe/RecipeListPage';

export default function LibraryPage() {
    const [selectedTab, setSelectedTab] = React.useState('exercise');

    const onSelect = (value: string) => {
        setSelectedTab(value);
    };

    // Filter to only show exercise and recipe
    const visibleContentTypes = ['exercise', 'recipe'];

    return (
        <PagePaper>
            {/* Header - consistent with other pages */}
            <HeadingContainer
                style={{
                    paddingBlock: 'var(--ce-size-md)',
                    paddingInline: 'var(--ce-size-lg)',
                }}
                withBorder={false}
            >
                <Stack gap="md">
                    <Title order={5}>Library</Title>
                    <Text
                        c="dimmed"
                        size="sm"
                        style={{
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Manage and curate all exercises and recipes for your coaching programs.
                    </Text>

                    {/* Compact tab navigation */}
                    <ScrollArea
                        scrollbars="x"
                        type="never"
                        w="100%"
                    >
                        <SegmentedControl
                            data={Object.entries(CONTENT_TYPE_CONFIG)
                                .filter(([key]) => visibleContentTypes.includes(key))
                                .map(([, config]) => ({
                                    value: config.value,
                                    label: (
                                        <Center style={{gap: 6}}>
                                            <config.icon
                                                size={16}
                                                stroke={1.5}
                                            />
                                            <span>{config.label}s</span>
                                        </Center>
                                    ),
                                }))}
                            fullWidth
                            onChange={onSelect}
                            radius="md"
                            size="sm"
                            style={{
                                minWidth: 'max-content',
                            }}
                            styles={{
                                root: {
                                    // backgroundColor: 'var(--mantine-color-gray-0)',
                                },
                                label: {
                                    padding: '8px 16px',
                                    fontSize: 'var(--footnote-font-size)',
                                    fontWeight: 500,
                                },
                                indicator: {
                                    boxShadow: 'var(--mantine-shadow-xs)',
                                },
                            }}
                            value={selectedTab}
                        />
                    </ScrollArea>
                </Stack>
            </HeadingContainer>

            {/* Content area */}
            <PaddingContainer
                paddingX={'lg'}
                paddingY={0}
                style={{
                    paddingTop: 'var(--ce-size-md)',
                    paddingBottom: 'var(--ce-size-xl)',
                }}
            >
                {selectedTab === 'exercise' && <ExerciseListPage />}
                {selectedTab === 'recipe' && <RecipeListPage />}
            </PaddingContainer>
        </PagePaper>
    );
}
