import { Stack, Loader, Alert } from "@mantine/core";
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
} from "@/components/listing/ActionableListGroup";
import ProfileUserInfo from "./ProfileUserInfo";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { ProfileAPI, ClientProfile } from "@/api/profile";

const ProfileContent = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await ProfileAPI.getMyProfile();
        
        if (!result.isError) {
          setProfile(result.getValue());
        } else {
          setError(result.getError().message);
        }
      } catch (err) {
        setError("An error occurred while loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    // Handle logout logic
    console.log("Logout clicked");
  };

  const handleEditProfile = () => {
    navigate("/profile/edit");
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Stack gap="xl" align="center" style={{ padding: "2rem" }}>
          <Loader size="md" />
        </Stack>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Stack gap="xl">
          <Alert color="red" title="Error">
            {error}
          </Alert>
        </Stack>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Stack gap="xl">
        <ProfileUserInfo
          name={profile?.name || "Loading..."}
          email={profile?.invitation_email || "Loading..."}
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
