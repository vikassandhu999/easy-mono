import {
  Group,
  Text,
  ActionIcon,
  Stack,
  rem,
  Drawer,
  ScrollArea,
  Button,
} from "@mantine/core";
import {
  IconUser,
  IconCalendar,
  IconCheck,
  IconMessage,
  IconTrendingUp,
} from "@tabler/icons-react";
import PaddingContainer from "../container/PaddingContainer";
import DrawerHeader from "./DrawerHeader";

const notifications = [
  {
    id: 1,
    title: "Message from your coach",
    message:
      "Great job on yesterday's workout! Let's focus on your nutrition today.",
    time: "5 minutes ago",
    type: "message",
    unread: true,
  },
  {
    id: 2,
    title: "Workout reminder",
    message: "Your leg day workout is scheduled in 30 minutes",
    time: "25 minutes ago",
    type: "reminder",
    unread: true,
  },
  {
    id: 3,
    title: "Progress update",
    message: "You've completed 15 workouts this month! Keep it up!",
    time: "2 hours ago",
    type: "progress",
    unread: false,
  },
  {
    id: 4,
    title: "New meal plan available",
    message: "Your coach has updated your meal plan for next week",
    time: "1 day ago",
    type: "program",
    unread: false,
  },
  {
    id: 5,
    title: "Workout completed",
    message: "Congratulations! You completed your upper body workout",
    time: "2 days ago",
    type: "completion",
    unread: false,
  },
];

type Props = {
  opened: boolean;
  onClose: () => void;
  open: () => void;
};

export default function NotificationDrawer({ opened, onClose }: Props) {
  return (
    <>
      <PaddingContainer paddingX={"xl"} paddingY={"md"}>
        <Drawer
          opened={opened}
          onClose={onClose}
          withCloseButton={false}
          position="right"
          size="md"
        >
          <Stack gap="sm">
            <DrawerHeader onClose={onClose} />

            <Group justify="flex-end">
              <Button
                variant="light"
                size="compact-sm"
                color="red"
                style={{ width: "max-content" }}
                onClick={() => {}}
              >
                clear
              </Button>
            </Group>

            <ScrollArea style={{ height: "calc(100vh - 200px)" }}>
              <Stack gap="sm">
                {notifications.map((notification) => (
                  <Group
                    key={notification.id}
                    p="md"
                    style={{
                      backgroundColor: "transparent",
                      borderRadius: rem(8),
                      borderLeft: "1px solid var(--mantine-color-gray-2)",
                      cursor: "pointer",
                    }}
                    align="flex-start"
                    gap="sm"
                  >
                    <ActionIcon
                      variant="light"
                      color={
                        notification.type === "message"
                          ? "blue"
                          : notification.type === "reminder"
                          ? "orange"
                          : notification.type === "progress"
                          ? "green"
                          : notification.type === "program"
                          ? "violet"
                          : "teal"
                      }
                      size="lg"
                    >
                      {notification.type === "message" ? (
                        <IconMessage size={16} />
                      ) : notification.type === "reminder" ? (
                        <IconCalendar size={16} />
                      ) : notification.type === "progress" ? (
                        <IconTrendingUp size={16} />
                      ) : notification.type === "program" ? (
                        <IconUser size={16} />
                      ) : (
                        <IconCheck size={16} />
                      )}
                    </ActionIcon>

                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group justify="space-between">
                        <Text fw={notification.unread ? 600 : 500} size="md">
                          {notification.title}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {notification.time}
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {notification.message}
                      </Text>
                    </Stack>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Drawer>
      </PaddingContainer>
    </>
  );
}
