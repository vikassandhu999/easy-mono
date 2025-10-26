import { Badge, Box, Button, Card, rem, Stack, Text } from "@mantine/core";
import { IconCalendar, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { JOINED_PROGRAMS } from "./mock";
import dayjs from "dayjs";

const getCurrentDate = () => {
  return dayjs().format("dddd, D MMM");
};

const Hero = () => {
  const navigate = useNavigate();

  // Check if user has any programs
  const hasPrograms = JOINED_PROGRAMS.length > 0;

  return (
    <Card
      radius="xl"
      p="md"
      style={{
        background: hasPrograms
          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        style={{
          position: "absolute",
          right: -20,
          top: -20,
          fontSize: rem(120),
          opacity: 0.3,
          transform: "rotate(-15deg)",
        }}
      >
        {hasPrograms ? "⏰" : "🚀"}
      </Box>
      <Stack gap="md" style={{ position: "relative", zIndex: 2 }}>
        <Badge
          size="sm"
          radius="md"
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            width: "fit-content",
          }}
        >
          {getCurrentDate()}
        </Badge>

        {hasPrograms ? (
          <>
            <Text size="xl" fw={700}>
              Stay On Track With
            </Text>
            <Text size="xl" fw={700} mt={-10}>
              Your Fitness Goals
            </Text>
            <Button
              variant="white"
              size="md"
              radius="xl"
              fw={600}
              onClick={() => navigate("/schedule")}
              style={{
                color: "#667eea",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                border: "none",
                marginTop: rem(16),
                alignSelf: "flex-start",
              }}
              leftSection={<IconCalendar size={18} />}
            >
              View Today's Schedule
            </Button>
          </>
        ) : (
          <>
            <Text size="xl" fw={700}>
              Start Your Fitness
            </Text>
            <Text size="xl" fw={700} mt={-10}>
              Journey Today!
            </Text>
            <Text
              size="sm"
              mt="xs"
              style={{ opacity: 0.9, maxWidth: rem(280) }}
            >
              Join a program designed by expert coaches to achieve your health
              and fitness goals
            </Text>
            <Button
              variant="white"
              size="md"
              radius="xl"
              fw={600}
              onClick={() => navigate("/programs/browse")}
              style={{
                color: "#FF6B6B",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                border: "none",
                marginTop: rem(16),
                alignSelf: "flex-start",
              }}
              leftSection={<IconPlus size={18} />}
            >
              Join a Program
            </Button>
          </>
        )}
      </Stack>
    </Card>
  );
};

export default Hero;
