import {useEffect, useMemo, useState} from 'react';

import {
    Alert,
    Badge,
    Box,
    Card,
    Divider,
    Group,
    Loader,
    SegmentedControl,
    Stack,
    Tabs,
    Text,
    Title,
} from '@mantine/core';

import {useGetWeekScheduleQuery} from '@/services/schedule';
import logger from '@/utils/logger';

type DayKey = string;

function formatIsoDate(isoDate: string) {
    // expects YYYY-MM-DD
    const [y, m, d] = isoDate.split('-').map((x) => Number(x));
    if (!y || !m || !d) return isoDate;

    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function weekdayLabel(weekday?: number) {
    // ISO weekday 1..7 (Mon..Sun)
    const map: Record<number, string> = {
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4: 'Thu',
        5: 'Fri',
        6: 'Sat',
        7: 'Sun',
    };
    if (!weekday) return 'Day';
    return map[weekday] ?? 'Day';
}

function completionColor(state?: string) {
    switch (state) {
        case 'completed':
            return 'green';
        case 'in_progress':
            return 'yellow';
        case 'not_started':
        default:
            return 'gray';
    }
}

function completionLabel(state?: string) {
    switch (state) {
        case 'completed':
            return 'Completed';
        case 'in_progress':
            return 'In progress';
        case 'not_started':
        default:
            return 'Not started';
    }
}

function kindLabel(kind?: string) {
    switch (kind) {
        case 'training':
            return 'Training';
        case 'nutrition':
            return 'Nutrition';
        default:
            return 'Item';
    }
}

type FilterKind = 'all' | 'training' | 'nutrition';

export default function SchedulePage() {
    const [filter, setFilter] = useState<FilterKind>('all');
    const [activeDay, setActiveDay] = useState<string | null>(null);

    const {data, isLoading, isFetching, error, refetch} = useGetWeekScheduleQuery();

    //

    logger.debug("Schedule Data:", data)

    const days = data?.data?.days ?? [];

    const normalizedDays = useMemo(() => {
        return days.map((day, idx) => {
            const key: DayKey =
                day?.date ??
                (typeof day?.weekday === 'number' ? `weekday-${day.weekday}` : `day-${idx}`);

            const header =
                day?.date != null
                    ? formatIsoDate(day.date)
                    : weekdayLabel(typeof day?.weekday === 'number' ? day.weekday : undefined);

            const rawTrainingItems = (day as {training?: {items?: unknown[]}})?.training?.items;
            const rawNutritionItems = (day as {nutrition?: {items?: unknown[]}})?.nutrition?.items;

            const trainingItems = Array.isArray(rawTrainingItems) ? rawTrainingItems : [];
            const nutritionItems = Array.isArray(rawNutritionItems) ? rawNutritionItems : [];

            const mergedItems = [...trainingItems, ...nutritionItems];

            const filteredItems =
                filter === 'all'
                    ? mergedItems
                    : mergedItems.filter((it) => (it as {kind?: string}).kind === filter);

            return {key, header, items: filteredItems};
        });
    }, [days, filter]);

    useEffect(() => {
        if (activeDay != null) return;
        if (normalizedDays.length === 0) return;
        setActiveDay(normalizedDays[0]!.key);
    }, [activeDay, normalizedDays]);

    const active = normalizedDays.find((d) => d.key === activeDay) ?? null;

    return (
        <Box p="md">
            <Group justify="space-between" align="center" mb="md">
                <Stack gap={2}>
                    <Title order={2}>Schedule</Title>
                    <Text c="dimmed" size="sm">
                        Your weekly plan (training + nutrition)
                    </Text>
                </Stack>

                <Group gap="sm">
                    <SegmentedControl
                        value={filter}
                        onChange={(v) => setFilter(v as FilterKind)}
                        data={[
                            {label: 'All', value: 'all'},
                            {label: 'Training', value: 'training'},
                            {label: 'Nutrition', value: 'nutrition'},
                        ]}
                    />
                </Group>
            </Group>

            {isLoading ? (
                <Group justify="center" mt="xl">
                    <Loader />
                </Group>
            ) : error ? (
                <Alert
                    color="red"
                    title="Couldn’t load schedule"
                    withCloseButton={false}
                    styles={{root: {maxWidth: 720}}}
                >
                    <Stack gap="sm">
                        <Text size="sm">
                            There was an error fetching your schedule. Try again.
                        </Text>
                        <Text
                            size="sm"
                            component="button"
                            style={{
                                cursor: 'pointer',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 0,
                                padding: 0,
                                textDecoration: 'underline',
                            }}
                            onClick={() => refetch()}
                        >
                            Retry
                        </Text>
                    </Stack>
                </Alert>
            ) : (
                <Stack gap="md">
                    {data?.data?.week_start || data?.data?.week_end ? (
                        <Text c="dimmed" size="sm">
                            {data?.data?.week_start ? `Week of ${data.data.week_start}` : ''}
                            {data?.data?.week_end ? ` → ${data.data.week_end}` : ''}
                            {isFetching ? ' (updating...)' : ''}
                        </Text>
                    ) : (
                        isFetching && (
                            <Text c="dimmed" size="sm">
                                Updating...
                            </Text>
                        )
                    )}

                    {normalizedDays.length === 0 ? (
                        <Text c="dimmed" size="sm">
                            No schedule data returned.
                        </Text>
                    ) : (
                        <Tabs value={activeDay} onChange={setActiveDay} keepMounted={false}>
                            <Tabs.List
                                style={{
                                    flexWrap: 'nowrap',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    WebkitOverflowScrolling: 'touch',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                }}
                                className="ScheduleDayTabsList"
                            >
                                {normalizedDays.map((day) => (
                                    <Tabs.Tab key={day.key} value={day.key} style={{flex: '0 0 auto'}}>
                                        <Group gap={8} wrap="nowrap">
                                            <Text size="sm" fw={600}>
                                                {day.header}
                                            </Text>
                                            <Badge variant="light" color="gray">
                                                {day.items.length}
                                            </Badge>
                                        </Group>
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>

                            {normalizedDays.map((day) => (
                                <Tabs.Panel key={day.key} value={day.key} pt="md">
                                    <Card withBorder radius="md" p="md">
                                        <Group justify="space-between" align="center" mb="xs">
                                            <Text fw={700}>{day.header}</Text>
                                            <Badge variant="light" color="gray">
                                                {day.items.length} item{day.items.length === 1 ? '' : 's'}
                                            </Badge>
                                        </Group>

                                        <Divider mb="sm" />

                                        {day.items.length === 0 ? (
                                            <Text c="dimmed" size="sm">
                                                Nothing scheduled.
                                            </Text>
                                        ) : (
                                            <Stack gap="sm">
                                                {day.items.map((item) => {
                                                    const it = item as {
                                                        id?: string;
                                                        kind?: string;
                                                        title?: string;
                                                        subtitle?: string | null;
                                                        status?: string;
                                                        date?: string;
                                                        cta?: string;
                                                        entity?: {
                                                            planned_workout_id?: string;
                                                            [key: string]: unknown;
                                                        };
                                                        completion?: {state?: string} | undefined;
                                                    };

                                                    const state = it.completion?.state ?? it.status;

                                                    return (
                                                        <Card
                                                            key={it.id ?? it.entity?.planned_workout_id ?? `${day.key}-${kindLabel(it.kind)}-${it.title ?? 'Untitled'}`}
                                                            withBorder
                                                            radius="md"
                                                            p="sm"
                                                            style={{background: 'var(--mantine-color-body)'}}
                                                        >
                                                            <Group justify="space-between" align="flex-start">
                                                                <Stack gap={2}>
                                                                    <Group gap="xs">
                                                                        <Badge
                                                                            variant="light"
                                                                            color={
                                                                                it.kind === 'training'
                                                                                    ? 'blue'
                                                                                    : it.kind === 'nutrition'
                                                                                      ? 'teal'
                                                                                      : 'gray'
                                                                            }
                                                                        >
                                                                            {kindLabel(it.kind)}
                                                                        </Badge>
                                                                        <Badge
                                                                            variant="light"
                                                                            color={completionColor(state)}
                                                                        >
                                                                            {completionLabel(state)}
                                                                        </Badge>
                                                                    </Group>

                                                                    <Text fw={600}>
                                                                        {it.title ?? 'Untitled'}
                                                                    </Text>
                                                                    {it.subtitle ? (
                                                                        <Text size="sm" c="dimmed">
                                                                            {it.subtitle}
                                                                        </Text>
                                                                    ) : null}
                                                                </Stack>
                                                            </Group>
                                                        </Card>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Card>
                                </Tabs.Panel>
                            ))}
                        </Tabs>
                    )}

                    {/* Keep `active` referenced so TS doesn't complain if you use it later for actions */}
                    {active == null ? null : null}
                </Stack>
            )}
        </Box>
    );
}
