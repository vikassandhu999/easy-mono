import {Alert, Button, LoadingOverlay, Stack, Text} from '@mantine/core';
import {useNavigate} from 'react-router';

import {useUser} from '@/providers/UserProvider';
import {useGetCoachQuery} from '@/services/coach';
import PaddingContainer from '@/shared/containers/PaddingContainer';

import ProfileActionGrid from '../components/ProfileActionGrid';
import ProfileActionList from '../components/ProfileActionList';
import ProfileHeader from '../components/ProfileHeader';
import ProfileLegalLinks from '../components/ProfileLegalLinks';
import {ACTION_GRID_CONFIG, ALERTS, LEGAL_LINKS} from '../ui_config';

const CoachProfilePage = () => {
    const navigate = useNavigate();

    const {user, isLoading: userLoading} = useUser();

    // Skip query when user.coach_profile is undefined
    const {
        data: coach,
        isLoading: coachLoading,
        error: coachError,
        refetch,
    } = useGetCoachQuery(user?.coach_profile?.id || '', {
        skip: !user?.coach_profile?.id,
    });

    // Combine loading states from useUser and useGetCoachQuery
    const loading = userLoading || coachLoading;

    // Handle case when user.coach_profile is undefined (Requirement 5.3)
    if (!userLoading && user && !user.coach_profile) {
        console.error('User does not have a coach profile');
        return (
            <PaddingContainer>
                <Alert
                    color={ALERTS.NO_COACH_PROFILE.color}
                    icon={ALERTS.NO_COACH_PROFILE.icon}
                    title={ALERTS.NO_COACH_PROFILE.title}
                >
                    <Text>{ALERTS.NO_COACH_PROFILE.message}</Text>
                </Alert>
            </PaddingContainer>
        );
    }

    // Handle useGetCoachQuery error state (Requirement 5.1, 5.4)
    if (coachError) {
        console.error('Failed to load coach profile:', coachError);
        return (
            <PaddingContainer>
                <Alert
                    color={ALERTS.LOAD_ERROR.color}
                    icon={ALERTS.LOAD_ERROR.icon}
                    title={ALERTS.LOAD_ERROR.title}
                >
                    <Stack gap="sm">
                        <Text>{ALERTS.LOAD_ERROR.message}</Text>
                        <Button
                            onClick={() => refetch()}
                            variant="light"
                        >
                            Retry
                        </Button>
                    </Stack>
                </Alert>
            </PaddingContainer>
        );
    }

    return (
        <>
            {/* Render LoadingOverlay when loading is true */}
            <LoadingOverlay visible={loading} />
            <PaddingContainer>
                <Stack gap="xl">
                    {/* Render ProfileCard component passing coach data and user data */}
                    {user && coach && <ProfileHeader user={user} />}

                    <ProfileActionGrid configs={ACTION_GRID_CONFIG} />
                    <ProfileActionList />

                    <Alert
                        color={ALERTS.BETA_FEEDBACK.color}
                        icon={ALERTS.BETA_FEEDBACK.icon}
                        title={ALERTS.BETA_FEEDBACK.title}
                    >
                        <Text fs="italic">{ALERTS.BETA_FEEDBACK.message}</Text>
                    </Alert>
                    <ProfileLegalLinks links={LEGAL_LINKS} />

                    <Button
                        color="red"
                        onClick={() => navigate('/profile/edit')}
                        variant="outline"
                    >
                        Logout
                    </Button>
                </Stack>
            </PaddingContainer>
        </>
    );
};

export default CoachProfilePage;
