import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useNavigate, useSearchParams} from 'react-router';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import MealSelect from '@/shared/MealSelect';

import {PLAN_BUILDER_PARAMS} from '../PlanBuilder/constants';

const PlanSessionSelect = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const discipline = searchParams.get(PLAN_BUILDER_PARAMS.PLAN_DISCIPLINE);

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
                    title="Select a meal"
                />
            </HeadingContainer>
            <PaddingContainer>
                {discipline === 'nutrition' && (
                    <MealSelect
                        multiple={false}
                        onCreateNew={() => {
                            console.log('Create');
                        }}
                        onSelect={(ids) => {
                            console.log('Implementation pending', ids[0]);
                        }}
                    />
                )}

                {discipline === 'workout' && <div>Hello</div>}
            </PaddingContainer>
        </Drawer>
    );
};

export default PlanSessionSelect;
