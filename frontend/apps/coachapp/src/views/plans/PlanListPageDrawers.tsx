import {useSearchParams} from 'react-router';

import {PLAN_DRAWER_VIEWS, PLAN_SELECTED_DRAWER_KEY} from './constants';
import PlanAssignDateDrawer from './PlanAssignDateDrawer';
import PlanClientSelectDrawer from './PlanClientSelectDrawer';
import {PlanCreateDrawer} from './PlanCreateDrawer';

type DrawerView = (typeof PLAN_DRAWER_VIEWS)[keyof typeof PLAN_DRAWER_VIEWS];

export default function PlanListPageDrawers() {
    const [searchParams] = useSearchParams();

    const activeDrawer = searchParams.get(PLAN_SELECTED_DRAWER_KEY) as DrawerView | null;

    switch (activeDrawer) {
        case PLAN_DRAWER_VIEWS.CREATE_PLAN:
            return <PlanCreateDrawer />;

        case PLAN_DRAWER_VIEWS.SELECT_CLIENT:
            return <PlanClientSelectDrawer />;

        case PLAN_DRAWER_VIEWS.ASSIGN_DATE:
            return <PlanAssignDateDrawer />;

        default:
            return null;
    }
}
