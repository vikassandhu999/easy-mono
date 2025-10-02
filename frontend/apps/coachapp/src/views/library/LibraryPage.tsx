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

    return (
        <PagePaper>
            <HeadingContainer
                style={{
                    paddingBlock: 'var(--ce-size-sm)',
                    paddingInline: 'var(--ce-size-lg)',
                }}
                withBorder={false}
            >
                <Stack
                    gap="xs"
                    style={{
                        flex: 1,
                    }}
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
                        Manage and curate all exercises, ingredients, techniques, activities, guides, and lessons.
                    </Text>
                </Stack>
            </HeadingContainer>
            <PaddingContainer
                paddingX={'lg'}
                paddingY={'md'}
                style={{marginTop: 'var(--ce-size-md)'}}
            >
                <Stack mb="md">
                    <ScrollArea
                        scrollbars="x"
                        type="never"
                        w="100%"
                    >
                        <SegmentedControl
                            data={Object.entries(CONTENT_TYPE_CONFIG).map(([, config]) => ({
                                value: config.value,
                                label: (
                                    <Center style={{gap: 10}}>
                                        <config.icon size={16} />
                                        <span>{config.label}s</span>
                                    </Center>
                                ),
                            }))}
                            fullWidth
                            onChange={onSelect}
                            radius={'lg'}
                            size="sm"
                            style={{minWidth: 'max-content'}}
                            value={selectedTab}
                        />
                    </ScrollArea>
                </Stack>

                {selectedTab === 'exercise' && <ExerciseListPage />}
                {selectedTab === 'recipe' && <RecipeListPage />}
            </PaddingContainer>
        </PagePaper>
    );
}
