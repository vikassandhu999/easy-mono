import {useSearchParams} from 'react-router';

import {PLAN_BUILDER_DRAWER_KEY, PLAN_BUILDER_DRAWER_VIEWS} from './constants';
import PlanSessionSelectDrawer from './PlanSessionSelectDrawer';

type ActiveDrawer = (typeof PLAN_BUILDER_DRAWER_VIEWS)[keyof typeof PLAN_BUILDER_DRAWER_VIEWS];

const PlanBuilderDrawers = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const activeDrawer: ActiveDrawer = searchParams.get(PLAN_BUILDER_DRAWER_KEY);

    switch (activeDrawer) {
        case PLAN_BUILDER_DRAWER_VIEWS.SELECT_SESSION:
            return <PlanSessionSelectDrawer />;
        default:
            return null;
    }
};

export default PlanBuilderDrawers;
