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

import type {CompletionState, FilterKind, ScheduleItem, WeeklyStats} from './types';

import {KindIcon} from './icons';
import {completionColor, completionLabel, getCtaLabel} from './status';

export function ScheduleSkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Skeleton
          animate
          height={24}
          radius="md"
          width={200}
        />
        <Skeleton
          animate
          height={36}
          radius="md"
          width={250}
        />
      </Group>
      <Skeleton
        animate
        height={14}
        radius="sm"
        width={180}
      />
      <Group
        gap="xs"
        mt="sm"
      >
        {[...Array(7)].map((_, i) => (
          <Skeleton
            animate
            height={48}
            key={i}
            radius="md"
            width={72}
          />
        ))}
      </Group>
      <Card
        mt="md"
        p="md"
        radius="md"
        withBorder
      >
        <Skeleton
          animate
          height={20}
          mb="md"
          radius="sm"
          width={120}
        />
        <Stack gap="sm">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              animate
              height={88}
              key={i}
              radius="md"
            />
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

export function EmptyDayState({filter, isToday = false}: EmptyDayStateProps) {
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
      title: filter === 'all' ? 'Nothing scheduled' : filter === 'training' ? 'No workouts' : 'No meals',
      subtitle: 'Check other days or add something new.',
      color: 'gray',
    };
  };

  const content = getContent();

  return (
    <Card
      p="xl"
      radius="md"
      style={{textAlign: 'center'}}
      withBorder
    >
      <Stack
        align="center"
        gap="md"
      >
        <ThemeIcon
          color={content.color}
          radius="xl"
          size={64}
          variant="light"
        >
          {content.icon}
        </ThemeIcon>
        <Stack gap={4}>
          <Text
            fw={600}
            size="md"
          >
            {content.title}
          </Text>
          <Text
            c="dimmed"
            size="sm"
          >
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

export function WeeklySummary({completed, total, streak = 0}: WeeklySummaryProps) {
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
      mb="md"
      p="md"
      radius="md"
      style={{
        background: isComplete
          ? `linear-gradient(135deg, ${theme.colors.green[0]} 0%, ${theme.colors.teal[0]} 100%)`
          : undefined,
        borderColor: isComplete ? theme.colors.green[4] : undefined,
        transition: 'all 0.3s ease',
      }}
      withBorder
    >
      <Group
        align="center"
        justify="space-between"
      >
        <Group gap="md">
          <RingProgress
            label={
              isComplete ? (
                <ThemeIcon
                  color="green"
                  radius="xl"
                  size="lg"
                  variant="light"
                >
                  <IconCheck size={18} />
                </ThemeIcon>
              ) : (
                <Text
                  fw={700}
                  size="xs"
                  ta="center"
                >
                  {percentage}%
                </Text>
              )
            }
            roundCaps
            sections={[
              {
                value: percentage,
                color: isComplete ? 'green' : percentage > 50 ? 'teal' : 'blue',
              },
            ]}
            size={60}
            thickness={6}
          />
          <Stack gap={2}>
            <Text
              fw={600}
              size="sm"
            >
              Weekly Progress
            </Text>
            <Text
              c="dimmed"
              size="xs"
            >
              {completed} of {total} completed
            </Text>
            <Text
              c={isComplete ? 'green' : 'blue'}
              fw={500}
              size="xs"
            >
              {getMotivationalText()}
            </Text>
          </Stack>
        </Group>

        <Stack
          align="flex-end"
          gap="xs"
        >
          {isComplete && (
            <Badge
              color="green"
              leftSection={<IconTrophy size={14} />}
              size="lg"
              variant="filled"
            >
              Week Complete!
            </Badge>
          )}
          {streak > 0 && (
            <Badge
              color="orange"
              leftSection={<IconFlame size={12} />}
              size="sm"
              variant="light"
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
  isToday?: boolean;
  total: number;
}

export function DayTabBadge({completed, total, isToday = false}: DayTabBadgeProps) {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <Group
      gap={4}
      wrap="nowrap"
    >
      <Text
        c={isComplete ? 'green' : 'dimmed'}
        size="xs"
      >
        {completed}/{total}
      </Text>
      {isComplete && (
        <IconCheck
          size={12}
          style={{color: 'var(--mantine-color-green-6)'}}
        />
      )}
      {isToday && !isComplete && (
        <Progress
          color="blue"
          radius="xl"
          size={4}
          value={percentage}
          w={24}
        />
      )}
    </Group>
  );
}

interface NextUpCardProps {
  item: ScheduleItem;
  onAction?: (item: ScheduleItem) => void;
}

export function NextUpCard({item, onAction}: NextUpCardProps) {
  const theme = useMantineTheme();
  const kindColor = item.kind === 'training' ? 'blue' : 'teal';

  return (
    <Card
      mb="md"
      onClick={() => onAction?.(item)}
      p="md"
      radius="md"
      style={{
        borderColor: theme.colors[kindColor][4],
        borderWidth: 2,
        background: `linear-gradient(135deg, ${theme.colors[kindColor][0]} 0%, var(--mantine-color-body) 100%)`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      withBorder
    >
      <Group
        align="center"
        justify="space-between"
      >
        <Group gap="md">
          <ThemeIcon
            color={kindColor}
            radius="md"
            size={48}
            variant="light"
          >
            <KindIcon
              kind={item.kind}
              size={24}
            />
          </ThemeIcon>
          <Stack gap={2}>
            <Group gap="xs">
              <Badge
                color={kindColor}
                size="xs"
                variant="filled"
              >
                Up Next
              </Badge>
              {item.time && (
                <Text
                  c="dimmed"
                  size="xs"
                >
                  <IconClock
                    size={10}
                    style={{marginRight: 2}}
                  />
                  {item.time}
                </Text>
              )}
            </Group>
            <Text
              fw={600}
              size="md"
            >
              {item.title ?? 'Untitled'}
            </Text>
            {item.subtitle && (
              <Text
                c="dimmed"
                lineClamp={1}
                size="xs"
              >
                {item.subtitle}
              </Text>
            )}
          </Stack>
        </Group>

        <Button
          color={kindColor}
          rightSection={<IconPlayerPlay size={16} />}
          size="sm"
          variant="filled"
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

export function ScheduleItemCard({item, onAction}: ScheduleItemCardProps) {
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
      p="sm"
      radius="md"
      style={{
        background: isCompleted
          ? `linear-gradient(90deg, ${theme.colors.green[0]} 0%, var(--mantine-color-body) 100%)`
          : isInProgress
            ? `linear-gradient(90deg, ${theme.colors.yellow[0]} 0%, var(--mantine-color-body) 100%)`
            : 'var(--mantine-color-body)',
        opacity: isDisabled ? 0.55 : 1,
        borderColor: isCompleted ? theme.colors.green[3] : isInProgress ? theme.colors.yellow[4] : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        transform: 'translateY(0)',
        ...(isInProgress && {
          animation: `${pulse} 2s ease-in-out infinite`,
        }),
      }}
      withBorder
    >
      <Group
        align="flex-start"
        justify="space-between"
        wrap="nowrap"
      >
        <Group
          gap="sm"
          style={{flex: 1, minWidth: 0}}
          wrap="nowrap"
        >
          <ThemeIcon
            color={isCompleted ? 'green' : isDisabled ? 'gray' : kindColor}
            radius="md"
            size={40}
            variant={isCompleted ? 'filled' : 'light'}
          >
            {isCompleted ? (
              <IconCheck size={20} />
            ) : (
              <KindIcon
                kind={item.kind}
                size={20}
              />
            )}
          </ThemeIcon>

          <Stack
            gap={4}
            style={{flex: 1, minWidth: 0}}
          >
            <Group
              gap="xs"
              wrap="nowrap"
            >
              <Badge
                color={completionColor(state)}
                size="xs"
                variant="light"
              >
                {completionLabel(state)}
              </Badge>
              {item.time && (
                <Group
                  gap={2}
                  wrap="nowrap"
                >
                  <IconClock
                    size={10}
                    style={{color: 'var(--mantine-color-dimmed)'}}
                  />
                  <Text
                    c="dimmed"
                    size="xs"
                  >
                    {item.time}
                  </Text>
                </Group>
              )}
            </Group>

            <Text
              fw={600}
              lineClamp={1}
              size="sm"
              style={{
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isDisabled ? 'var(--mantine-color-dimmed)' : undefined,
              }}
            >
              {item.title ?? 'Untitled'}
            </Text>

            {item.subtitle && (
              <Text
                c="dimmed"
                lineClamp={1}
                size="xs"
              >
                {item.subtitle}
              </Text>
            )}

            {isInProgress && (
              <Progress
                animated
                color="yellow"
                mt={4}
                radius="xl"
                size="xs"
                value={50}
              />
            )}
          </Stack>
        </Group>

        <Stack
          align="flex-end"
          gap="xs"
        >
          {isDisabled ? (
            <Group gap={4}>
              <IconLock
                size={12}
                style={{color: 'var(--mantine-color-dimmed)'}}
              />
              <Text
                c="dimmed"
                size="xs"
              >
                {getDisabledReason()}
              </Text>
            </Group>
          ) : (
            <Button
              color={isCompleted ? 'gray' : kindColor}
              rightSection={
                isCompleted ? (
                  <IconChevronRight size={14} />
                ) : isInProgress ? (
                  <IconRefresh size={14} />
                ) : (
                  <IconPlayerPlay size={14} />
                )
              }
              size="xs"
              variant={isCompleted ? 'subtle' : 'light'}
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
      <Tooltip
        label={getDisabledReason()}
        position="top"
        withArrow
      >
        <div style={{pointerEvents: 'auto'}}>{cardContent}</div>
      </Tooltip>
    );
  }

  return cardContent;
}

interface ScheduleItemListProps {
  filter: FilterKind;
  isToday?: boolean;
  items: ScheduleItem[];
  onAction?: (item: ScheduleItem) => void;
}

export function ScheduleItemList({items, filter, isToday = false, onAction}: ScheduleItemListProps) {
  if (items.length === 0) {
    return (
      <EmptyDayState
        filter={filter}
        isToday={isToday}
      />
    );
  }

  // Find the next actionable item for "Up Next" card
  const nextItem = isToday
    ? items.find(
        (item) =>
          (item.completion?.state ?? item.status) !== 'completed' &&
          (item.completion?.state ?? item.status) !== 'skipped' &&
          (item.completion?.state ?? item.status) !== 'upcoming',
      )
    : undefined;

  const otherItems = nextItem ? items.filter((i) => i !== nextItem) : items;

  return (
    <Stack gap="sm">
      {nextItem && (
        <NextUpCard
          item={nextItem}
          onAction={onAction}
        />
      )}
      {otherItems.map((item, index) => (
        <Transition
          duration={200}
          key={item.id ?? index}
          mounted
          timingFunction="ease"
          transition="fade"
        >
          {(styles) => (
            <div style={styles}>
              <ScheduleItemCard
                item={item}
                onAction={onAction}
              />
            </div>
          )}
        </Transition>
      ))}
    </Stack>
  );
}
