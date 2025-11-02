import {Drawer, Space, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useNavigate, useSearchParams} from 'react-router';

import {Client} from '@/services/clients';
import ClientSelect from '@/shared/ClientSelect';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';

import {PLAN_DRAWER_VIEWS, PLAN_SEARCH_PARAMS, PLAN_SELECTED_DRAWER_KEY} from './constants';

const PlanClientSelectDrawer = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const planId = searchParams.get(PLAN_SEARCH_PARAMS.PLAN_ID);
    const handleDrawerClose = () => {
        navigate(-1);
    };

    const handleClientSelect = (selectedClients: Client[]) => {
        if (!selectedClients || selectedClients.length === 0 || !planId) {
            notifications.show({
                color: 'yellow',
                message:
                    'Either the plan or the client you want to assign the plan to is missing. Please select properply',
                title: 'Warning',
            });
            return;
        }

        const selectedClient = selectedClients[0];

        try {
            setSearchParams((previousParams) => {
                previousParams.set(PLAN_SELECTED_DRAWER_KEY, PLAN_DRAWER_VIEWS.ASSIGN_DATE);
                previousParams.set(PLAN_SEARCH_PARAMS.PLAN_ID, planId);
                previousParams.set(PLAN_SEARCH_PARAMS.CLIENT_ID, selectedClient.id);
                return previousParams;
            });
        } catch (error) {
            notifications.show({
                color: 'red',
                message: 'Failed to proceed. Please try again.',
                title: 'Error',
            });
        }
    };

    const renderContent = () => {
        if (!planId) {
            return (
                <PaddingContainer>
                    Either the plan or the client you want to assign the plan to is missing. Please select properply.
                </PaddingContainer>
            );
        }

        return (
            <ClientSelect
                multiple={false}
                onComplete={handleClientSelect}
            />
        );
    };

    return (
        <Drawer
            onClose={handleDrawerClose}
            opened={true}
            position="right"
            size="md"
            withCloseButton={false}
        >
            <HeadingContainer sticky>
                <Header
                    onBack={handleDrawerClose}
                    title="Select a client"
                />
                <Text
                    fs="italic"
                    size="xs"
                >
                    Please select a client to whom you want to assign this plan.
                </Text>
            </HeadingContainer>
            <Space h={72} />
            <PaddingContainer></PaddingContainer>
            {renderContent()}
        </Drawer>
    );
};

export default PlanClientSelectDrawer;
