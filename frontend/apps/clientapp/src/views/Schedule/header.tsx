import HeadingContainer from "@/shared/container/HeaderContainer";
import { Title, Group, Stack } from "@mantine/core";

const ScheduleHeader = () => {
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
            <Title order={5}>Schedule</Title>
          </Stack>
        </Group>
      </Stack>
    </HeadingContainer>
  );
};

export default ScheduleHeader;
