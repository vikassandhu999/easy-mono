import {
  Badge,
  Button,
  Card,
  Group,
  Progress,
  RingProgress,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  Transition,
  useMantineTheme,
} from '@mantine/core';
import {
  IconCalendarOff,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconFlame,
  IconLock,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react';

import { completionColor, completionLabel, getCtaLabel } from './status';
import { KindIcon } from './icons';
import type { CompletionState, FilterKind, ScheduleItem, WeeklyStats } from './types';




export function ScheduleSkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Skeleton height={24} width={200} radius="md" animate />
        <Skeleton height={36} width={250} radius="md" animate />
      </Group>
      <Skeleton height={14} width={180} radius="sm" animate />
      <Group gap="xs" mt="sm">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} height={48} width={72} radius="md" animate />
        ))}
      </Group>
      <Card withBorder radius="md" p="md" mt="md">
        <Skeleton height={20} width={120} mb="md" radius="sm" animate />
        <Stack gap="sm">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} height={88} radius="md" animate />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

interface EmptyDayStateProps {
  filter: FilterKind;
  isToday?: boolean;
}

export function EmptyDayState({ filter, isToday = false }: EmptyDayStateProps) {
  const getContent = () => {
    if (isToday) {
      if (filter === 'all') {
        return {
          icon: <IconSparkles size={32} />,
          title: "You're all free today! 🎉",
          subtitle: 'No tasks scheduled. Enjoy your rest day!',
          color: 'green',
        };
      }
      if (filter === 'training') {
        return {
          icon: <IconFlame size={32} />,
          title: 'Rest day from training',
          subtitle: 'Recovery is part of the process. Come back stronger!',
          color: 'orange',
        };
      }
      return {
        icon: <IconCalendarOff size={32} />,
        title: 'No meals planned',
        subtitle: 'Want to add a meal plan for today?',
        color: 'teal',
      };
    }

    // Future/past day
    return {
      icon: <IconCalendarOff size={32} />,
      title:
        filter === 'all'
          ? 'Nothing scheduled'
          : filter === 'training'
            ? 'No workouts'
            : 'No meals',
      subtitle: 'Check other days or add something new.',
      color: 'gray',
    };
  };

  const content = getContent();

  return (
    <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
      <Stack align="center" gap="md">
        <ThemeIcon size={64} radius="xl" variant="light" color={content.color}>
          {content.icon}
        </ThemeIcon>
        <Stack gap={4}>
          <Text fw={600} size="md">
            {content.title}
          </Text>
          <Text c="dimmed" size="sm">
            {content.subtitle}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}

interface WeeklySummaryProps extends WeeklyStats {
  streak?: number;
}

export function WeeklySummary({ completed, total, streak = 0 }: WeeklySummaryProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = percentage === 100;
  const theme = useMantineTheme();

  const getMotivationalText = () => {
    if (percentage === 0) return "Let's get started!";
    if (percentage < 25) return 'Good start, keep going!';
    if (percentage < 50) return "You're making progress!";
    if (percentage < 75) return 'Over halfway there!';
    if (percentage < 100) return 'Almost done, finish strong!';
    return 'Amazing work this week!';
  };

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      mb="md"
      style={{
        background: isComplete
          ? `linear-gradient(135deg, ${theme.colors.green[0]} 0%, ${theme.colors.teal[0]} 100%)`
          : undefined,
        borderColor: isComplete ? theme.colors.green[4] : undefined,
        transition: 'all 0.3s ease',
      }}
    >
      <Group justify="space-between" align="center">
        <Group gap="md">
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[
              {
                value: percentage,
                color: isComplete ? 'green' : percentage > 50 ? 'teal' : 'blue',
              },
            ]}
            label={
              isComplete ? (
                <ThemeIcon color="green" variant="light" radius="xl" size="lg">
                  <IconCheck size={18} />
                </ThemeIcon>
              ) : (
                <Text size="xs" ta="center" fw={700}>
                  {percentage}%
                </Text>
              )
            }
          />
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              Weekly Progress
            </Text>
            <Text size="xs" c="dimmed">
              {completed} of {total} completed
            </Text>
            <Text size="xs" c={isComplete ? 'green' : 'blue'} fw={500}>
              {getMotivationalText()}
            </Text>
          </Stack>
        </Group>

        <Stack gap="xs" align="flex-end">
          {isComplete && (
            <Badge
              color="green"
              variant="filled"
              size="lg"
              leftSection={<IconTrophy size={14} />}
            >
              Week Complete!
            </Badge>
          )}
          {streak > 0 && (
            <Badge
              color="orange"
              variant="light"
              size="sm"
              leftSection={<IconFlame size={12} />}
            >
              {streak} day streak
            </Badge>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

interface DayTabBadgeProps {
  completed: number;
  total: number;
  isToday?: boolean;
}

export function DayTabBadge({ completed, total, isToday = false }: DayTabBadgeProps) {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" c={isComplete ? 'green' : 'dimmed'}>
        {completed}/{total}
      </Text>
      {isComplete && (
        <IconCheck size={12} style={{ color: 'var(--mantine-color-green-6)' }} />
      )}
      {isToday && !isComplete && (
        <Progress
          value={percentage}
          size={4}
          w={24}
          color="blue"
          radius="xl"
        />
      )}
    </Group>
  );
}

interface NextUpCardProps {
  item: ScheduleItem;
  onAction?: (item: ScheduleItem) => void;
}

export function NextUpCard({ item, onAction }: NextUpCardProps) {
  const theme = useMantineTheme();
  const kindColor = item.kind === 'training' ? 'blue' : 'teal';

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      mb="md"
      style={{
        borderColor: theme.colors[kindColor][4],
        borderWidth: 2,
        background: `linear-gradient(135deg, ${theme.colors[kindColor][0]} 0%, var(--mantine-color-body) 100%)`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => onAction?.(item)}
    >
      <Group justify="space-between" align="center">
        <Group gap="md">
          <ThemeIcon size={48} radius="md" variant="light" color={kindColor}>
            <KindIcon kind={item.kind} size={24} />
          </ThemeIcon>
          <Stack gap={2}>
            <Group gap="xs">
              <Badge size="xs" variant="filled" color={kindColor}>
                Up Next
              </Badge>
              {item.time && (
                <Text size="xs" c="dimmed">
                  <IconClock size={10} style={{ marginRight: 2 }} />
                  {item.time}
                </Text>
              )}
            </Group>
            <Text fw={600} size="md">
              {item.title ?? 'Untitled'}
            </Text>
            {item.subtitle && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.subtitle}
              </Text>
            )}
          </Stack>
        </Group>

        <Button
          variant="filled"
          color={kindColor}
          size="sm"
          rightSection={<IconPlayerPlay size={16} />}
        >
          {getCtaLabel(item.kind, item.status)}
        </Button>
      </Group>
    </Card>
  );
}

interface ScheduleItemCardProps {
  item: ScheduleItem;
  onAction?: (item: ScheduleItem) => void;
}

export function ScheduleItemCard({ item, onAction }: ScheduleItemCardProps) {
  const state = (item.completion?.state ?? item.status) as CompletionState;
  const isCompleted = state === 'completed';
  const isInProgress = state === 'in_progress';
  const isDisabled = state === 'skipped' || state === 'upcoming';
  const theme = useMantineTheme();
  const kindColor = item.kind === 'training' ? 'blue' : item.kind === 'nutrition' ? 'teal' : 'gray';

  const handleClick = () => {
    if (!isDisabled) {
      onAction?.(item);
    }
  };

  const getDisabledReason = () => {
    if (state === 'upcoming') return 'Available tomorrow';
    if (state === 'skipped') return 'This was skipped';
    return '';
  };

  const cardContent = (
    <Card
      withBorder
      radius="md"
      p="sm"
      style={{
        background: isCompleted
          ? `linear-gradient(90deg, ${theme.colors.green[0]} 0%, var(--mantine-color-body) 100%)`
          : isInProgress
            ? `linear-gradient(90deg, ${theme.colors.yellow[0]} 0%, var(--mantine-color-body) 100%)`
            : 'var(--mantine-color-body)',
        opacity: isDisabled ? 0.55 : 1,
        borderColor: isCompleted
          ? theme.colors.green[3]
          : isInProgress
            ? theme.colors.yellow[4]
            : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        transform: 'translateY(0)',
        ...(isInProgress && {
          animation: `${pulse} 2s ease-in-out infinite`,
        }),
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ThemeIcon
            size={40}
            radius="md"
            variant={isCompleted ? 'filled' : 'light'}
            color={isCompleted ? 'green' : isDisabled ? 'gray' : kindColor}
          >
            {isCompleted ? <IconCheck size={20} /> : <KindIcon kind={item.kind} size={20} />}
          </ThemeIcon>

          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Badge
                size="xs"
                variant="light"
                color={completionColor(state)}
              >
                {completionLabel(state)}
              </Badge>
              {item.time && (
                <Group gap={2} wrap="nowrap">
                  <IconClock size={10} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text size="xs" c="dimmed">
                    {item.time}
                  </Text>
                </Group>
              )}
            </Group>

            <Text
              fw={600}
              size="sm"
              style={{
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isDisabled ? 'var(--mantine-color-dimmed)' : undefined,
              }}
              lineClamp={1}
            >
              {item.title ?? 'Untitled'}
            </Text>

            {item.subtitle && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.subtitle}
              </Text>
            )}

            {isInProgress && (
              <Progress
                value={50}
                size="xs"
                color="yellow"
                radius="xl"
                animated
                mt={4}
              />
            )}
          </Stack>
        </Group>

        <Stack gap="xs" align="flex-end">
          {isDisabled ? (
            <Group gap={4}>
              <IconLock size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="xs" c="dimmed">
                {getDisabledReason()}
              </Text>
            </Group>
          ) : (
            <Button
              variant={isCompleted ? 'subtle' : 'light'}
              color={isCompleted ? 'gray' : kindColor}
              size="xs"
              rightSection={
                isCompleted ? (
                  <IconChevronRight size={14} />
                ) : isInProgress ? (
                  <IconRefresh size={14} />
                ) : (
                  <IconPlayerPlay size={14} />
                )
              }
            >
              {getCtaLabel(item.kind, state)}
            </Button>
          )}
        </Stack>
      </Group>
    </Card>
  );

  if (isDisabled) {
    return (
      <Tooltip label={getDisabledReason()} position="top" withArrow>
        <div style={{ pointerEvents: 'auto' }}>{cardContent}</div>
      </Tooltip>
    );
  }

  return cardContent;
}

interface ScheduleItemListProps {
  items: ScheduleItem[];
  filter: FilterKind;
  isToday?: boolean;
  onAction?: (item: ScheduleItem) => void;
}

export function ScheduleItemList({
  items,
  filter,
  isToday = false,
  onAction,
}: ScheduleItemListProps) {
  if (items.length === 0) {
    return <EmptyDayState filter={filter} isToday={isToday} />;
  }

  // Find the next actionable item for "Up Next" card
  const nextItem = isToday
    ? items.find(
        (item) =>
          (item.completion?.state ?? item.status) !== 'completed' &&
          (item.completion?.state ?? item.status) !== 'skipped' &&
          (item.completion?.state ?? item.status) !== 'upcoming'
      )
    : undefined;

  const otherItems = nextItem ? items.filter((i) => i !== nextItem) : items;

  return (
    <Stack gap="sm">
      {nextItem && <NextUpCard item={nextItem} onAction={onAction} />}
      {otherItems.map((item, index) => (
        <Transition
          key={item.id ?? index}
          mounted
          transition="fade"
          duration={200}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
              <ScheduleItemCard item={item} onAction={onAction} />
            </div>
          )}
        </Transition>
      ))}
    </Stack>
  );
}
