import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useNavigate, useParams, useSearchParams} from 'react-router';

import {useGetPlan} from '@/services/plans';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';

import PlanSessionSelect from '../PlanSessionSelect';
import {PLAN_EDITOR_SEARCH_PARAMS} from './constants';
import PlanInformationCard from './PlanInformationCard';

const PlanSessionSelectDrawer = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {planId} = useParams();

    const discipline = searchParams.get(PLAN_EDITOR_SEARCH_PARAMS.DISCIPLINE);

    const {data: plan} = useGetPlan(planId, {
        skip: !planId,
    });
    const assignSession = async (sessionId: string) => {
        if (!planId) {
            notifications.show({
                color: 'red',
                message: 'Plan is missing make sure you come from the right URL',
            });
            return null;
        }
        console.log(sessionId);
    };
    if (!['nutrition', 'workout'].includes(discipline)) {
        notifications.show({
            color: 'red',
            message: 'Unknown plan discipline',
        });

        return null;
    }

    const handleDrawerClose = () => {
        navigate(-1);
    };

    const sessionType = discipline === 'nurition' ? 'meal' : 'workout';

    return (
        <Drawer
            onClose={handleDrawerClose}
            opened={true}
            size="md"
            withCloseButton={false}
        >
            <HeadingContainer>
                <Header
                    onBack={handleDrawerClose}
                    title={`Select a ${sessionType}`}
                />
            </HeadingContainer>
            <PaddingContainer paddingY="lg">
                <PlanInformationCard plan={plan} />
            </PaddingContainer>
            <PaddingContainer>
                <PlanSessionSelect
                    multiple={false}
                    onCreateNew={() => {
                        console.log('Create');
                    }}
                    onSelect={(id: string | string[]) => {
                        assignSession(id as string);
                    }}
                    type={sessionType}
                />
            </PaddingContainer>
        </Drawer>
    );
};
export default PlanSessionSelectDrawer;
