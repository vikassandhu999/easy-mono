import {
  Group,
  Text,
  ActionIcon,
  Stack,
  rem,
  Card,
  Badge,
  ScrollArea,
  Button,
  Box,
  Progress,
  Flex,
} from "@mantine/core";

import {
  IconTrendingUp,
  IconClock,
  IconChevronRight,
  IconActivity,
} from "@tabler/icons-react";

import { JOINED_PROGRAMS } from "./mock";
import { useNavigate } from "react-router";

const ProgramSection = () => {
  const navigate = useNavigate();

  // For demonstration, you can change this to an empty array to see the empty state
  const hasPrograms = JOINED_PROGRAMS.length > 0;

  // Empty state component
  const EmptyProgramState = () => (
    <Card
      radius="lg"
      p="xl"
      style={{
        border: "2px dashed var(--mantine-color-gray-3)",
        backgroundColor: "var(--mantine-color-gray-0)",
        textAlign: "center",
      }}
    >
      <Stack gap="md" align="center">
        <Box
          style={{
            width: rem(80),
            height: rem(80),
            borderRadius: "50%",
            backgroundColor: "var(--mantine-color-blue-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconActivity size={40} color="var(--mantine-color-blue-6)" />
        </Box>

        <Stack gap={4} align="center">
          <Text size="lg" fw={600}>
            No Programs Yet
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={300}>
            Start your fitness journey by joining a program tailored to your
            goals
          </Text>
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>
          My Programs
        </Text>
        {hasPrograms && (
          <Button
            variant="subtle"
            rightSection={<IconChevronRight size={16} />}
            onClick={() => navigate("/programs")}
          >
            See All
          </Button>
        )}
      </Group>

      {!hasPrograms ? (
        <EmptyProgramState />
      ) : (
        <ScrollArea type="never" scrollbars="x">
          <Flex
            gap="md"
            style={{ minWidth: "max-content", paddingBottom: rem(4) }}
          >
            {JOINED_PROGRAMS.map((program) => (
              <Card
                key={program.id}
                radius="lg"
                p="lg"
                shadow="sm"
                style={{
                  minWidth: rem(280),
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                onClick={() => navigate(`/programs/${program.id}`)}
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text
                      size={rem(32)}
                      style={{
                        background: `var(--mantine-color-${program.color}-1)`,
                        borderRadius: rem(12),
                        padding: rem(8),
                        width: rem(56),
                        height: rem(56),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {program.image}
                    </Text>
                    <Badge
                      size="sm"
                      color={program.color}
                      variant="light"
                      radius="md"
                    >
                      {program.status}
                    </Badge>
                  </Group>

                  <Stack gap={4}>
                    <Text fw={600} size="lg">
                      {program.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      with {program.coach}
                    </Text>
                  </Stack>

                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">
                        Progress
                      </Text>
                      <Text size="xs" fw={500}>
                        {program.progress}%
                      </Text>
                    </Group>
                    <Progress
                      value={program.progress}
                      color={program.color}
                      size="sm"
                      radius="xl"
                    />
                  </Box>

                  <Group justify="space-between" mt="xs">
                    <Group gap="xs">
                      <IconClock
                        size={14}
                        color="var(--mantine-color-dimmed)"
                      />
                      <Text size="xs" c="dimmed">
                        {program.daysLeft} days left
                      </Text>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color={program.color}
                    >
                      <IconTrendingUp size={14} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Flex>
        </ScrollArea>
      )}
    </Box>
  );
};

export default ProgramSection;
