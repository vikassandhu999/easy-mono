import {Alert, Loader, Stack} from '@mantine/core';
import {IconHeadset, IconLock, IconLogout, IconTemplate, IconUserScreen} from '@tabler/icons-react';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router';

import {ClientProfile, ProfileAPI, UserProfile} from '@/api/profile';
import {useHandleLogout} from '@/hooks/useLogout';
import AlertError from '@/shared/errors/alertError';
import ActionableListGroup, {ActionableListItem} from '@/shared/listing/ActionableListGroup';

import ProfileUserInfo from './ProfileUserInfo';
import styles from './styles.module.css';

const ProfileContent = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ClientProfile | null | UserProfile>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);
    const logout = useHandleLogout();

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
                setError('An error occurred while loading profile');
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
        navigate('/profile/edit');
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <Stack
                    align="center"
                    gap="xl"
                    style={{padding: '2rem'}}
                >
                    <Loader size="md" />
                </Stack>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <AlertError
                    description="Please try again later."
                    message={error}
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Stack gap="xl">
                <ProfileUserInfo
                    email={userEmail}
                    name={profile?.name || 'CoachEasy User'}
                    onEditProfile={handleEditProfile}
                />

                <ActionableListGroup title="My Space">
                    <ActionableListItem
                        disabled={false}
                        icon={<IconTemplate size={20} />}
                        title="My Program"
                    />
                    <ActionableListItem
                        icon={<IconUserScreen size={20} />}
                        title="My Coaches"
                    />
                    <ActionableListItem
                        icon={<IconHeadset size={20} />}
                        title="Support"
                    />
                </ActionableListGroup>

                <ActionableListGroup title="Others">
                    <ActionableListItem
                        icon={<IconLock size={20} />}
                        title="Privacy Policy"
                    />
                    <ActionableListItem
                        icon={<IconLogout size={20} />}
                        onClick={logout}
                        title="Logout"
                    />
                </ActionableListGroup>
            </Stack>
        </div>
    );
};

export default ProfileContent;
