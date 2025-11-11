import HeadingContainer from "@/shared/container/HeaderContainer";
import { Title, Group, Stack, ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "react-router";

const ProfileEditHeader = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  return (
    <HeadingContainer
      withBorder={false}
      style={{
        paddingInline: "var(--ce-size-lg)",
        paddingBlock: "var(--ce-size-sm)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap" w="100%">
          <ActionIcon
            size="lg"
            radius="md"
            c="dark"
            variant="subtle"
            onClick={handleBack}
            aria-label="Go back"
          >
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Stack gap="0" style={{ flex: 1 }}>
            <Title order={5}>Edit Profile</Title>
          </Stack>
        </Group>
      </Stack>
    </HeadingContainer>
  );
};

export default ProfileEditHeader;
