import React, {FC, useState} from 'react';

import {Plan} from '@/store/services/plans';

import PlanWeekdayDetails from './PlanWeekdayDetails';
import PlanWeekDayTabs from './PlanWeekdayTabs';

type PlanWorkoutEditorProps = {
    plan: Plan;
};

const PlanWorkoutEditor: FC<PlanWorkoutEditorProps> = ({plan}) => {
    const [selectedWeekday, setSelectWeekday] = useState<number>(0);

    const handleWeekdayChange = (day: number) => {
        setSelectWeekday(day);
    };
    return (
        <React.Fragment>
            <PlanWeekDayTabs
                onWeekdayChange={handleWeekdayChange}
                plan={plan}
                weekday={selectedWeekday}
            />
            <PlanWeekdayDetails
                onWeekdayChange={handleWeekdayChange}
                plan={plan}
                weekday={selectedWeekday}
            />
        </React.Fragment>
    );
};

export default PlanWorkoutEditor;
