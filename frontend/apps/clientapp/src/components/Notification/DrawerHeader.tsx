import { Title, Group, Stack, ActionIcon } from "@mantine/core";
import HeadingContainer from "../Containers/HeaderContainer";
import { IconX } from "@tabler/icons-react";

const DrawerHeader = ({ onClose }: { onClose: () => void }) => {
  return (
    <HeadingContainer
      withBorder={false}
      style={{
        paddingInline: "var(--ce-size-lg)",
        paddingBlock: "var(--ce-size-sm)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="start" wrap="nowrap" w="100%">
          <Stack gap="0" style={{ flex: 1 }}>
            <Title order={5}>Notification</Title>
          </Stack>
          <ActionIcon size="lg" variant="light" onClick={onClose}>
            <IconX />
          </ActionIcon>
        </Group>
      </Stack>
    </HeadingContainer>
  );
};

export default DrawerHeader;
