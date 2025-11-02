import {Button} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {FC} from 'react';
import {useSearchParams} from 'react-router';

import {Plan} from '@/services/plans';

import {PLAN_EDITOR_DRAWER_KEY, PLAN_EDITOR_DRAWER_VIEWS, PLAN_EDITOR_SEARCH_PARAMS} from '../constants';

type PlanWeekdayDetailsProps = {
    plan: Plan;
    weekday: number;
    onWeekdayChange: (weekday: number) => void;
};

const PlanWeekdayDetails: FC<PlanWeekdayDetailsProps> = (props) => {
    const setSearchParams = useSearchParams()[1];
    const {plan, weekday} = props;

    const handleAddSession = () => {
        setSearchParams((prev) => {
            prev.set(PLAN_EDITOR_DRAWER_KEY, PLAN_EDITOR_DRAWER_VIEWS.ADD_SESSION);
            prev.set(PLAN_EDITOR_SEARCH_PARAMS.DISCIPLINE, plan.discipline);
            prev.set(PLAN_EDITOR_SEARCH_PARAMS.WEEKDAY, weekday.toString());
            return prev;
        });
    };

    return (
        <>
            <Button
                color="blue"
                fullWidth
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                    handleAddSession();
                }}
                radius="lg"
                size="md"
                variant="light"
            >
                Add Workout
            </Button>
        </>
    );
};

export default PlanWeekdayDetails;
