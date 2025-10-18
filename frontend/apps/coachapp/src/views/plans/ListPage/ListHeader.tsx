import {Button, Center, Group, ScrollArea, SegmentedControl, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {MagnifyingGlassIcon} from '@phosphor-icons/react';
import {IconTablePlus} from '@tabler/icons-react';
import React from 'react';

import {PlanDiscipline} from '@/api/plans';
import {PLAN_DISCIPLINES} from '@/components/Configs';
import HeadingContainer from '@/components/containers/HeaderContainer';
import Header from '@/components/layouts/Header';

type PlansPageProps = {
    discipline: PlanDiscipline;
    isLoading?: boolean;
    onCreateClick?: () => void;
    onDisciplineChange?: (discipline: PlanDiscipline) => void;
    onSearchChange?: (search: string) => void;
    ref?: React.Ref<HTMLDivElement>;
};

export default function PlansListHeader({
    discipline,
    onCreateClick,
    onDisciplineChange,
    onSearchChange,
    ref,
}: PlansPageProps) {
    const onSearchChangeDebounced = useDebouncedCallback(onSearchChange, 300);

    const disciplineOptions = Object.entries(PLAN_DISCIPLINES).map(([key, config]) => ({
        value: key,
        label: (
            <Center style={{gap: 6}}>
                <config.icon
                    size={16}
                    stroke={1.5}
                />
                <span>{config.label}</span>
            </Center>
        ),
    }));

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
                        <Group gap="xs">
                            <Button
                                leftSection={<IconTablePlus size={18} />}
                                onClick={onCreateClick}
                                radius="xl"
                                size="sm"
                            >
                                Create Plan
                            </Button>
                        </Group>
                    }
                    title="Plans"
                />

                {/* Discipline Filter */}
                <ScrollArea
                    scrollbars="x"
                    type="never"
                    w="100%"
                >
                    <SegmentedControl
                        data={disciplineOptions}
                        fullWidth
                        onChange={(value) => onDisciplineChange?.(value as PlanDiscipline)}
                        radius="xl"
                        size="lg"
                        value={discipline}
                    />
                </ScrollArea>

                <TextInput
                    leftSection={<MagnifyingGlassIcon size={16} />}
                    m={0}
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search plans..."
                    radius="xl"
                    size="md"
                    styles={{
                        input: {
                            borderRadius: 'var(--body-offset)',
                        },
                        root: {flex: 1},
                    }}
                    variant="filled"
                />
            </Stack>
        </HeadingContainer>
    );
}
