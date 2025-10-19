import {Button, Group, ScrollArea, SegmentedControl, Stack, TextInput} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {IconTablePlus} from '@tabler/icons-react';
import React from 'react';

import {PLAN_DISCIPLINES} from '@/components/Configs';
import HeadingContainer from '@/components/containers/HeaderContainer';
import Header from '@/components/layouts/Header';
import {PlanDiscipline} from '@/store/services/plans';

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
            <Group
                gap="xs"
                wrap="nowrap"
            >
                <config.icon
                    size={16}
                    stroke={1.5}
                />
                <span>{config.label}</span>
            </Group>
        ),
    }));

    return (
        <HeadingContainer ref={ref}>
            <Stack gap="sm">
                <Header
                    actions={
                        <Group gap="xs">
                            <Button
                                leftSection={<IconTablePlus size={18} />}
                                onClick={onCreateClick}
                                radius="xl"
                                size="md"
                            >
                                Create plan
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
                        aria-label="Filter plans by discipline"
                        data={disciplineOptions}
                        fullWidth
                        onChange={(value) => onDisciplineChange?.(value as PlanDiscipline)}
                        radius="xl"
                        size="md"
                        value={discipline}
                    />
                </ScrollArea>

                <TextInput
                    aria-label="Search plans"
                    onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                    placeholder="Search plans..."
                    radius="xl"
                    size="md"
                    variant="filled"
                />
            </Stack>
        </HeadingContainer>
    );
}
