import {Button} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconPlus} from '@tabler/icons-react';
import {FC} from 'react';

import {Plan} from '@/store/services/plans';

type PlanWeekdayDetailsProps = {
    plan: Plan;
    weekday: number;
    onWeekdayChange: (weekday: number) => void;
};

const PlanWeekdayDetails: FC<PlanWeekdayDetailsProps> = (props) => {
    const {plan, weekday} = props;

    return (
        <>
            {plan.name} - {weekday}
            <Button
                color="blue"
                fullWidth
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                    notifications.show({
                        color: 'red',
                        message: 'Not Implemented Yet!',
                    });
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
