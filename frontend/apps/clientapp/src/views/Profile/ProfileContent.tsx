import { Stack } from "@mantine/core";
import {
  IconHeadset,
  IconLock,
  IconLogout,
  IconTemplate,
  IconUserScreen,
} from "@tabler/icons-react";
import styles from "./styles.module.css";
import ActionableListGroup, {
  ActionableListItem,
} from "@/Components/Listing/ActionableListGroup";
import ProfileUserInfo from "./ProfileUserInfo";
import { useNavigate } from "react-router";

const ProfileContent = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    // Handle logout logic
    console.log("Logout clicked");
  };

  const handleEditProfile = () => {
    navigate("/profile/edit");
  };

  return (
    <div className={styles.container}>
      <Stack gap="xl">
        <ProfileUserInfo
          name="Coffeestories"
          email="mark.brook@icloud.com"
          onEditProfile={handleEditProfile}
        />

        <ActionableListGroup title="My Space">
          <ActionableListItem
            title="My Program"
            icon={<IconTemplate size={20} />}
          />
          <ActionableListItem
            title="My Coaches"
            icon={<IconUserScreen size={20} />}
          />
          <ActionableListItem
            title="Support"
            icon={<IconHeadset size={20} />}
          />
        </ActionableListGroup>

        <ActionableListGroup title="Others">
          <ActionableListItem
            title="Privacy Policy"
            icon={<IconLock size={20} />}
          />
          <ActionableListItem
            title="Logout"
            onClick={handleLogout}
            icon={<IconLogout size={20} />}
          />
        </ActionableListGroup>
      </Stack>
    </div>
  );
};

export default ProfileContent;
