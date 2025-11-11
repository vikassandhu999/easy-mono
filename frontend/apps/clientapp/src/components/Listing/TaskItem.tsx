import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  IconBook,
  IconBowl,
  IconCalendarUp,
  IconCheck,
  IconCircle,
  IconPlayerPlay,
  IconRestore,
  IconTreadmill,
} from "@tabler/icons-react";

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

const TaskItem: React.FC<TaskItemProps> = ({
  id: _,
  title,
  sessionStatus,
  taskType,
  onUpdateStatus,
}) => {
  const theme = useMantineTheme();

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
          <ActionIcon
            variant="outline"
            color="gray"
            size="lg"
            radius={"lg"}
            onClick={handleStartTask}
          >
            <IconCalendarUp size={16} />
          </ActionIcon>
        );
      case "in_progress":
        return (
          <ActionIcon
            variant="light"
            color="green"
            size="lg"
            radius={"lg"}
            onClick={handleStartTask}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        );
      case "completed":
        return (
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            radius={"lg"}
            onClick={handleStartTask}
          >
            <IconCheck size={16} />
          </ActionIcon>
        );
      case "skipped":
        return (
          <ActionIcon
            variant="outline"
            color="red"
            size="lg"
            radius={"lg"}
            onClick={handleStartTask}
          >
            <IconRestore size={16} />
          </ActionIcon>
        );
      case "partial":
        return (
          <ActionIcon
            variant="light"
            color="yellow"
            size="lg"
            radius={"lg"}
            onClick={handleStartTask}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        );
      default:
        return null;
    }
  };

  const isActionable = ["scheduled", "in_progress", "partial"].includes(
    sessionStatus
  );

  return (
    <Group
      my="sm"
      justify="space-between"
      style={{
        borderRadius: theme.radius.lg,
        padding: theme.spacing.sm,
        border: `1px solid var(--mantine-color-gray-3)`,
        backgroundColor: "var(--mantine-color-gray-1)",
        cursor: isActionable ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "visible",
        alignItems: "center",
        "&:hover": isActionable
          ? {
              transform: "translateY(-2px)",
              boxShadow: theme.shadows.md,
            }
          : {},
      }}
      onClick={isActionable ? handleStartTask : undefined}
    >
      <Group gap="md" justify="space-between" align="center">
        <Avatar size="sm" variant="subtle" color="gray">
          <TaskTypeIcon size={18} />
        </Avatar>
        <Stack gap={4}>
          <Text size="md" fw={600} c={"dark"}>
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
              <Text size="xs" c="dimmed" tt="capitalize">
                {sessionStatus.replace("_", " ")}
              </Text>
            </Group>
          )}
        </Stack>
      </Group>

      <Box>{getActionButton()}</Box>
    </Group>
  );
};

export default TaskItem;
