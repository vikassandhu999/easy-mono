import {Button, Center, Drawer, Group, LoadingOverlay, Space, Stack, Text} from '@mantine/core';
import {DateInput} from '@mantine/dates';
import {notifications} from '@mantine/notifications';
import {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import {useGetClientQuery} from '@/services/clients';
import {useCopyPlanToClient} from '@/services/plans';
import ClientProfileCard from '@/shared/ClientProfileCard';
import {FixedBottomBar} from '@/shared/containers/FixedBottomBar';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';

import {parseDateToStr, PLAN_MIN_DATE_ASSIGN, PLAN_SEARCH_PARAMS} from './constants';

const PlanAssignDateDrawer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const clientId = searchParams.get(PLAN_SEARCH_PARAMS.CLIENT_ID);
    const planId = searchParams.get(PLAN_SEARCH_PARAMS.PLAN_ID);

    const {
        data: client,
        isLoading: isLoadingClient,
        isError: isClientError,
    } = useGetClientQuery(clientId!, {
        skip: !clientId,
    });

    const [copyPlanToClient] = useCopyPlanToClient();

    const handleBack = () => {
        navigate(-1);
    };

    const handleDateSelect = (date: Date | null) => {
        setSelectedDate(date);
    };

    const handleAssignPlan = async (closeAfterAssign: boolean | undefined) => {
        if (!clientId || !planId) {
            notifications.show({
                color: 'red',
                message:
                    'Either the plan or the client you want to assign the plan to is missing. Please select properply',
                title: 'Error',
            });
            return;
        }

        if (!selectedDate) {
            notifications.show({
                color: 'red',
                message: 'Please select plan start date',
                title: 'Error',
            });
            return;
        }

        try {
            const startDateFormatted = parseDateToStr(selectedDate);

            await copyPlanToClient({
                client_id: clientId,
                plan_id: planId,
                start_date: startDateFormatted,
            }).unwrap();

            notifications.show({
                color: 'green',
                message: 'Plan assigned successfully',
                title: 'Success',
            });

            if (closeAfterAssign) {
                navigate(-2);
            } else {
                // TODO : Implement this
            }
        } catch (error) {
            notifications.show({
                color: 'red',
                message: 'Failed to assign plan. Please try again.',
                title: 'Assignment failed',
            });
        }
    };

    const renderContent = () => {
        if (isClientError) {
            return (
                <PaddingContainer>
                    <Center>
                        <Text c="red">
                            Could not fetch the client. If the issue persist for long time please contact us through
                            support.
                        </Text>
                    </Center>
                </PaddingContainer>
            );
        }

        if (client) {
            return (
                <PaddingContainer
                    paddingX="lg"
                    paddingY="sm"
                >
                    <Stack gap="lg">
                        <ClientProfileCard client={client} />
                        <DateInput
                            clearable
                            label="Start Date"
                            minDate={PLAN_MIN_DATE_ASSIGN}
                            // @ts-expect-error - Mantine DateInput onChange type mismatch
                            onChange={handleDateSelect}
                            placeholder="Pick a date"
                            value={selectedDate}
                        />
                    </Stack>
                </PaddingContainer>
            );
        }

        return null;
    };

    const isFormValid = client && selectedDate && !isLoadingClient && !isClientError && planId;

    return (
        <Drawer
            onClose={handleBack}
            opened={true}
            position="right"
            size="md"
            withCloseButton={false}
        >
            <LoadingOverlay visible={isLoadingClient} />

            <HeadingContainer sticky>
                <Header
                    onBack={handleBack}
                    title="Please select starting date"
                />

                <Text
                    fs="italic"
                    size="xs"
                >
                    Choose starting date of the plan for the client.
                </Text>
            </HeadingContainer>

            <Space h={100} />

            {renderContent()}

            <FixedBottomBar>
                <Group>
                    <Button
                        disabled={!isFormValid}
                        flex={1}
                        onClick={() => handleAssignPlan(true)}
                        radius="md"
                        size="lg"
                        variant="light"
                    >
                        {`Assign & Close`}
                    </Button>
                    <Button
                        disabled={!isFormValid}
                        flex={1}
                        onClick={() => handleAssignPlan(false)}
                        radius="md"
                        size="lg"
                    >
                        {`Assign & View`}
                    </Button>
                </Group>
            </FixedBottomBar>
        </Drawer>
    );
};

export default PlanAssignDateDrawer;
