import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {IconApple, IconBarbell, IconCheck, IconRefresh} from '@tabler/icons-react';
import {useEffect, useMemo, useState} from 'react';

import {useGetWeekScheduleQuery} from '@/services/schedule';
import logger from '@/utils/logger';

import {EmptyDayState, ScheduleItemCard, ScheduleSkeleton, WeeklySummary} from '../helpers/components';
import {formatIsoDate, formatShortDate, isToday} from '../helpers/date';
import {weekdayLabel} from '../helpers/status';
import {FilterKind, ScheduleItem} from '../helpers/types';

export default function SchedulePage() {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [activeDay, setActiveDay] = useState<null | string>(null);

  const {data, isLoading, isFetching, error, refetch} = useGetWeekScheduleQuery();

  logger.debug('Schedule Data:', data);

  const days = data?.data?.days ?? [];

  const normalizedDays = useMemo(() => {
    return days.map((day: any, idx: number) => {
      const key = day?.date ?? (typeof day?.weekday === 'number' ? `weekday-${day.weekday}` : `day-${idx}`);

      const header =
        day?.date != null
          ? formatShortDate(day.date)
          : weekdayLabel(typeof day?.weekday === 'number' ? day.weekday : undefined);

      const fullHeader =
        day?.date != null
          ? formatIsoDate(day.date)
          : weekdayLabel(typeof day?.weekday === 'number' ? day.weekday : undefined);

      const isTodayFlag = day?.date ? isToday(day.date) : false;

      const rawTrainingItems = (day as {training?: {items?: unknown[]}})?.training?.items;
      const rawNutritionItems = (day as {nutrition?: {items?: unknown[]}})?.nutrition?.items;

      const trainingItems = Array.isArray(rawTrainingItems) ? rawTrainingItems : [];
      const nutritionItems = Array.isArray(rawNutritionItems) ? rawNutritionItems : [];

      const mergedItems = [...trainingItems, ...nutritionItems] as ScheduleItem[];

      const filteredItems = filter === 'all' ? mergedItems : mergedItems.filter((it) => it.kind === filter);

      const completedCount = filteredItems.filter((it) => (it.completion?.state ?? it.status) === 'completed').length;

      return {
        key,
        header,
        fullHeader,
        isToday: isTodayFlag,
        items: filteredItems,
        completedCount,
        totalCount: filteredItems.length,
      };
    });
  }, [days, filter]);

  useEffect(() => {
    if (activeDay != null) return;
    if (normalizedDays.length === 0) return;

    const todayDay = normalizedDays.find((d: any) => d.isToday);
    if (todayDay) {
      setActiveDay(todayDay.key);
    } else {
      setActiveDay(normalizedDays[0]!.key);
    }
  }, [activeDay, normalizedDays]);

  const active = normalizedDays.find((d: any) => d.key === activeDay) ?? null;

  const weeklyStats = useMemo(() => {
    let completed = 0;
    let total = 0;
    normalizedDays.forEach((day: any) => {
      completed += day.completedCount;
      total += day.totalCount;
    });
    return {completed, total};
  }, [normalizedDays]);

  const handleItemAction = (item: ScheduleItem) => {
    // TODO: Navigate to workout/meal detail or start session
    logger.debug('Item action:', item);
  };

  return (
    <Box p="md">
      <Group
        align="flex-start"
        justify="space-between"
        mb="md"
        wrap="wrap"
      >
        <Stack gap={2}>
          <Group gap="xs">
            <Title order={2}>Schedule</Title>
            {isFetching && !isLoading && (
              <Tooltip label="Refreshing...">
                <Badge
                  circle
                  color="gray"
                  size="sm"
                  variant="light"
                >
                  <IconCheck size={12} />
                </Badge>
              </Tooltip>
            )}
          </Group>
          <Text
            c="dimmed"
            size="sm"
          >
            Your weekly plan
          </Text>
        </Stack>

        <Group gap="sm">
          <SegmentedControl
            data={[
              {label: 'All', value: 'all'},
              {
                label: (
                  <Group
                    gap={4}
                    wrap="nowrap"
                  >
                    <IconBarbell size={14} />
                    <span>Training</span>
                  </Group>
                ),
                value: 'training',
              },
              {
                label: (
                  <Group
                    gap={4}
                    wrap="nowrap"
                  >
                    <IconApple size={14} />
                    <span>Nutrition</span>
                  </Group>
                ),
                value: 'nutrition',
              },
            ]}
            onChange={(v) => setFilter(v as FilterKind)}
            value={filter}
          />
          <Tooltip label="Refresh">
            <ActionIcon
              color="gray"
              loading={isFetching}
              onClick={() => refetch()}
              variant="subtle"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {isLoading ? (
        <ScheduleSkeleton />
      ) : error ? (
        <Alert
          color="red"
          styles={{root: {maxWidth: 720}}}
          title="Couldn't load schedule"
          withCloseButton={false}
        >
          <Stack gap="sm">
            <Text size="sm">There was an error fetching your schedule. Please try again.</Text>
            <Button
              color="red"
              leftSection={<IconRefresh size={14} />}
              onClick={() => refetch()}
              size="xs"
              variant="light"
            >
              Retry
            </Button>
          </Stack>
        </Alert>
      ) : (
        <Stack gap="md">
          {data?.data?.week_start && (
            <Text
              c="dimmed"
              size="xs"
            >
              Week of {formatIsoDate(data.data.week_start)}
              {data?.data?.week_end ? ` → ${formatIsoDate(data.data.week_end)}` : ''}
            </Text>
          )}

          {weeklyStats.total > 0 && (
            <WeeklySummary
              completed={weeklyStats.completed}
              total={weeklyStats.total}
            />
          )}

          {normalizedDays.length === 0 ? (
            <Card
              p="xl"
              radius="md"
              style={{textAlign: 'center'}}
              withBorder
            >
              <Stack
                align="center"
                gap="sm"
              >
                <Text size="xl">📭</Text>
                <Text c="dimmed">No schedule data available.</Text>
                <Button
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => refetch()}
                  size="xs"
                  variant="light"
                >
                  Refresh
                </Button>
              </Stack>
            </Card>
          ) : (
            <Tabs
              keepMounted={false}
              onChange={setActiveDay}
              value={activeDay}
            >
              <Tabs.List
                className="ScheduleDayTabsList"
                style={{
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 4,
                }}
              >
                {normalizedDays.map((day: any) => {
                  const allDone = day.totalCount > 0 && day.completedCount === day.totalCount;
                  const progressPct = day.totalCount > 0 ? (day.completedCount / day.totalCount) * 100 : 0;

                  return (
                    <Tabs.Tab
                      key={day.key}
                      style={{
                        flex: '0 0 auto',
                        position: 'relative',
                      }}
                      value={day.key}
                    >
                      <Stack
                        align="center"
                        gap={2}
                      >
                        <Group
                          gap={6}
                          wrap="nowrap"
                        >
                          {day.isToday && (
                            <Box
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--mantine-color-blue-filled)',
                              }}
                            />
                          )}
                          <Text
                            c={day.isToday ? 'blue' : undefined}
                            fw={day.isToday ? 700 : 500}
                            size="sm"
                          >
                            {day.header}
                          </Text>
                        </Group>
                        {day.totalCount > 0 ? (
                          <Badge
                            color={allDone ? 'green' : 'gray'}
                            size="xs"
                            variant="light"
                          >
                            {allDone ? (
                              <Group gap={2}>
                                <IconCheck size={10} />
                                {day.totalCount}
                              </Group>
                            ) : (
                              `${day.completedCount}/${day.totalCount}`
                            )}
                          </Badge>
                        ) : (
                          <Badge
                            color="gray"
                            size="xs"
                            variant="light"
                          >
                            —
                          </Badge>
                        )}
                        {day.totalCount > 0 && (
                          <Box
                            style={{
                              width: '100%',
                              height: 3,
                              borderRadius: 9999,
                              background: '#e9ecef',
                            }}
                          >
                            <Box
                              style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                borderRadius: 9999,
                                background: allDone ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-blue-6)',
                                transition: 'width 120ms ease',
                              }}
                            />
                          </Box>
                        )}
                      </Stack>
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>

              {normalizedDays.map((day: any) => (
                <Tabs.Panel
                  key={day.key}
                  pt="md"
                  value={day.key}
                >
                  <Card
                    p="md"
                    radius="md"
                    withBorder
                  >
                    <Group
                      align="center"
                      justify="space-between"
                      mb="xs"
                    >
                      <Group gap="xs">
                        {day.isToday && (
                          <Badge
                            color="blue"
                            size="sm"
                            variant="filled"
                          >
                            Today
                          </Badge>
                        )}
                        <Text fw={700}>{day.fullHeader}</Text>
                      </Group>
                      {day.totalCount > 0 && (
                        <Text
                          c="dimmed"
                          size="xs"
                        >
                          {day.completedCount} of {day.totalCount} done
                        </Text>
                      )}
                    </Group>

                    {day.totalCount > 0 && (
                      <Box
                        style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 9999,
                          background: 'var(--mantine-color-gray-1)',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <Box
                          style={{
                            width: `${day.totalCount > 0 ? (day.completedCount / day.totalCount) * 100 : 0}%`,
                            height: '100%',
                            borderRadius: 9999,
                            background:
                              day.completedCount === day.totalCount
                                ? 'var(--mantine-color-green-6)'
                                : 'var(--mantine-color-blue-6)',
                            transition: 'width 120ms ease',
                          }}
                        />
                      </Box>
                    )}

                    {day.items.length === 0 ? (
                      <EmptyDayState filter={filter} />
                    ) : (
                      <Stack gap="sm">
                        {day.items.map((item: ScheduleItem, idx: number) => (
                          <ScheduleItemCard
                            item={item}
                            key={item.id ?? item.entity?.planned_workout_id ?? `${day.key}-${idx}`}
                            onAction={handleItemAction}
                          />
                        ))}
                      </Stack>
                    )}
                  </Card>
                </Tabs.Panel>
              ))}
            </Tabs>
          )}

          {/* Reference active to avoid TS warning */}
          {active == null ? null : null}
        </Stack>
      )}
    </Box>
  );
}
