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
import { useEffect, useMemo, useState } from "react";
import { ProfileAPI, ClientProfile, UserProfile } from "@/api/profile";
import AlertError from "@/components/errors/alertError";
import { useHandleLogout } from "@/hooks/useLogout";

const ProfileContent = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logout = useHandleLogout()

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

  // Move useMemo before conditional returns to maintain hook order
  const userEmail = useMemo(() => {
    if (!profile) return undefined;
    if ('invitation_email' in profile) {
      return profile.invitation_email;
    } else if ('email' in profile) {
      return profile.email;
    }
    return undefined;
  }, [profile]);

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
        <AlertError message={error} description="Please try again later." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Stack gap="xl">
        <ProfileUserInfo
          name={profile?.name || "CoachEasy User"}
          email={userEmail}
          onEditProfile={handleEditProfile}
        />

        <ActionableListGroup title="My Space">
          <ActionableListItem
            title="My Program"
            disabled={false}
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
            onClick={logout}
            icon={<IconLogout size={20} />}
          />
        </ActionableListGroup>
      </Stack>
    </div>
  );
};

export default ProfileContent;
