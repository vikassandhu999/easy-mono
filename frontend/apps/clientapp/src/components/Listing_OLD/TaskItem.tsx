import {
  Avatar,
  Badge,
  Box,
  Group,
  rem,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  IconBook,
  IconBowl,
  IconCheck,
  IconCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconPlayerPlay,
  IconProgressCheck,
  IconTreadmill,
} from "@tabler/icons-react";
import { Button } from "@mantine/core";

type TaskType = "workout" | "meal" | "lesson";

type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "skipped"
  | "partial";

type TaskItemProps = {
  id: string;
  title?: string;
  sessionStatus: SessionStatus;
  taskType: TaskType;
  onUpdateStatus?: (status: SessionStatus) => void;
};

const getStatusConfig = (status: SessionStatus) => {
  switch (status) {
    case "scheduled":
      return {
        color: "blue",
        variant: "light" as const,
        icon: IconClock,
        bgColor: "blue.0",
        textColor: "blue.7",
      };
    case "in_progress":
      return {
        color: "orange",
        variant: "filled" as const,
        icon: IconPlayerPlay,
        bgColor: "orange.1",
        textColor: "orange.8",
      };
    case "completed":
      return {
        color: "green",
        variant: "filled" as const,
        icon: IconCircleCheck,
        bgColor: "green.0",
        textColor: "green.8",
      };
    case "skipped":
      return {
        color: "red",
        variant: "light" as const,
        icon: IconCircleX,
        bgColor: "red.0",
        textColor: "red.7",
      };
    case "partial":
      return {
        color: "yellow",
        variant: "filled" as const,
        icon: IconProgressCheck,
        bgColor: "yellow.0",
        textColor: "yellow.8",
      };
    default:
      return {
        color: "gray",
        variant: "outline" as const,
        icon: IconCircle,
        bgColor: "gray.1",
        textColor: "gray.7",
      };
  }
};

const TaskItem: React.FC<TaskItemProps> = ({
  id: _,
  title,
  sessionStatus,
  taskType,
  onUpdateStatus,
}) => {
  const theme = useMantineTheme();
  const statusConfig = getStatusConfig(sessionStatus);
  const StatusIcon = statusConfig.icon;

  const handleStartTask = () => {
    if (onUpdateStatus) {
      if (sessionStatus === "scheduled") {
        onUpdateStatus("in_progress");
      } else if (sessionStatus === "in_progress") {
        onUpdateStatus("completed");
      }
    }
  };

  const getTaskTypeConfig = (type: TaskType) => {
    switch (type) {
      case "workout":
        return { icon: IconTreadmill, color: "blue", label: "Workout" };
      case "meal":
        return { icon: IconBowl, color: "orange", label: "Meal" };
      case "lesson":
        return { icon: IconBook, color: "violet", label: "Lesson" };
      default:
        return { icon: IconCircle, color: "gray", label: "Task" };
    }
  };

  const taskTypeConfig = getTaskTypeConfig(taskType);
  const TaskTypeIcon = taskTypeConfig.icon;

  const getActionButton = () => {
    switch (sessionStatus) {
      case "scheduled":
        return (
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            variant="filled"
            color="blue"
            size="sm"
            onClick={handleStartTask}
            style={{ minWidth: "120px" }}
          >
            Start {taskTypeConfig.label}
          </Button>
        );
      case "in_progress":
        return (
          <Button
            leftSection={<IconCheck size={16} />}
            variant="outline"
            color="green"
            size="sm"
            radius="md"
            onClick={handleStartTask}
            style={{ minWidth: "120px" }}
          >
            Mark Complete
          </Button>
        );
      case "completed":
        return (
          <Badge
            size="lg"
            variant="filled"
            color="gray"
            leftSection={<IconCircleCheck size={14} />}
          >
            Completed
          </Badge>
        );
      case "skipped":
        return (
          <Badge
            size="lg"
            variant="outline"
            color="gray"
            leftSection={<IconCircleX size={14} />}
          >
            Skipped
          </Badge>
        );
      case "partial":
        return (
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            variant="outline"
            color="orange"
            size="sm"
            radius="md"
            onClick={handleStartTask}
            style={{ minWidth: "120px" }}
          >
            Continue
          </Button>
        );
      default:
        return null;
    }
  };

  const isActionable = ["scheduled", "in_progress", "partial"].includes(
    sessionStatus
  );

  const getThemeColor = (color: string, shade: number) => {
    return (
      theme.colors[color]?.[shade] ||
      theme.colors.blue[shade] ||
      theme.colors.blue[0]
    );
  };

  return (
    <Box
      my="sm"
      style={{
        background: isActionable
          ? `linear-gradient(90deg, ${getThemeColor(
              taskTypeConfig.color,
              0
            )} 0%, white 20%)`
          : getThemeColor("gray", 0),
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        border: `1px solid ${getThemeColor("gray", 3)}`,
        cursor: isActionable ? "pointer" : "default",
        transition: "all 0.2s ease",

        position: "relative",
        overflow: "visible",
        "&:hover": isActionable
          ? {
              transform: "translateY(-2px)",
              boxShadow: theme.shadows.md,
            }
          : {},
      }}
      onClick={isActionable ? handleStartTask : undefined}
    >
      <Box
        style={{
          position: "absolute",
          top: -8,
          left: 16,
          background: getThemeColor(taskTypeConfig.color, 6),
          color: "white",
          padding: `4px 8px`,
          borderRadius: theme.radius.xl,
          fontSize: rem(10),
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {taskTypeConfig.label}
      </Box>

      <Group justify="space-between" align="center" pt="md">
        <Group gap="md" align="center">
          <Avatar
            size="lg"
            color={taskTypeConfig.color}
            variant={isActionable ? "filled" : "light"}
          >
            <TaskTypeIcon size={24} />
          </Avatar>
          <Stack gap={4}>
            <Text size="md" fw={600} c={isActionable ? "dark" : "dimmed"}>
              {title}
            </Text>

            {isActionable && (
              <Text size="xs" c="dimmed">
                {sessionStatus === "scheduled" && "Ready to start"}
                {sessionStatus === "in_progress" &&
                  "In progress - tap to complete"}
                {sessionStatus === "partial" && "Continue where you left off"}
              </Text>
            )}

            {!isActionable && (
              <Group gap="xs">
                <StatusIcon size={12} color={statusConfig.color} />
                <Text size="xs" c="dimmed" tt="capitalize">
                  {sessionStatus.replace("_", " ")}
                </Text>
              </Group>
            )}
          </Stack>
        </Group>

        <Box>{getActionButton()}</Box>
      </Group>
    </Box>
  );
};

export default TaskItem;
