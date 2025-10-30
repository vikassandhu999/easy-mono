import {useSearchParams} from 'react-router';

import {PLAN_EDITOR_DRAWER_KEY, PLAN_EDITOR_DRAWER_VIEWS} from './constants';
import PlanSessionSelect from './PlanSessionSelect';
type DrawerView = keyof typeof PLAN_EDITOR_DRAWER_VIEWS;

const PlanEditorDrawers = () => {
    const [searchParams] = useSearchParams();

    const activeDrawer = searchParams.get(PLAN_EDITOR_DRAWER_KEY) as DrawerView;
    switch (activeDrawer) {
        case PLAN_EDITOR_DRAWER_VIEWS.ADD_SESSION:
            return <PlanSessionSelect />;
        default:
            return null;
    }
};

export default PlanEditorDrawers;
