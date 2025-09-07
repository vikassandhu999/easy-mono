import { Group, Avatar, Text, ActionIcon, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BellIcon } from "@phosphor-icons/react";

import { useNavigate } from "react-router";
import NotificationDrawer from "../../Components/Notification/NotificationDrawer";
import Hero from "./Hero";
import ProgramSection from "./ProgramSection";
import SpaceSwitcher from "../../Components/SpaceSwitcher/SpaceSwitcher";

export default function HomePage() {
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Stack
        gap="xl"
        style={{
          padding: rem(20),
          minHeight: "100vh",
          paddingBottom: rem(100),
        }}
      >
        {/* Header */}

        <Group wrap="nowrap" justify="space-between" mb="md">
          <Group>
            <ActionIcon
              variant="subtle"
              size="xl"
              radius="md"
              onClick={() => navigate("/profile")}
              aria-label="View profile"
            >
              <Avatar size="lg" radius="xl" variant="light" color="gray" />
            </ActionIcon>
            <Stack gap={2}>
              <Text size="xxl" lh={"xs"} fw={600}>
                Hello, Navraj
              </Text>
              <Text size="lg" c="dimmed">
                Welcome back!
              </Text>
            </Stack>
          </Group>

          <ActionIcon
            variant="light"
            size="xl"
            radius="xl"
            onClick={open}
            aria-label="View notifications"
          >
            <BellIcon size={24} />
          </ActionIcon>
        </Group>

        <Hero />
        <ProgramSection />
      </Stack>

      <NotificationDrawer opened={opened} open={open} onClose={close} />
    </>
  );
}
