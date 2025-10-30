import {FC, useState} from 'react';

import {Plan} from '@/store/services/plans';

import PlanWeekdayDetails from './PlanWeekdayDetails';
import PlanWeekDayTabs from './PlanWeekdayTabs';

type PlanNutritionEditorProps = {
    plan: Plan;
};

const PlanNutritionEditor: FC<PlanNutritionEditorProps> = ({plan}) => {
    const [selectedWeekday, setSelectWeekday] = useState<number>(0);

    const handleWeekdayChange = (day: number) => {
        setSelectWeekday(day);
    };
    return (
        <>
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
        </>
    );
};

export default PlanNutritionEditor;
