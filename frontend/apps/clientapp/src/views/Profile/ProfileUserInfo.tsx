import { Stack, Text, Button, Avatar } from "@mantine/core";
import styles from "./styles.module.css";

type ProfileUserInfoProps = {
  avatar?: string;
  name: string;
  email: string;
  onEditProfile: () => void;
};

const ProfileUserInfo = ({
  avatar,
  name,
  email,
  onEditProfile,
}: ProfileUserInfoProps) => {
  return (
    <Stack gap="md" align="center">
      <Avatar
        variant="light"
        color="blue"
        src={avatar}
        alt={name}
        size={80}
        radius={40}
      />
      <Stack gap={4} align="center">
        <Text className={styles.userName}>{name}</Text>
        <Text className={styles.userEmail}>{email}</Text>
      </Stack>
      <Button onClick={onEditProfile} radius="xl" size="md">
        Edit profile
      </Button>
    </Stack>
  );
};

export default ProfileUserInfo;
