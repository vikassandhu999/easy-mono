import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

export const PLAN_ASSIGN_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
export const PLAN_MIN_DATE_ASSIGN = new Date();

dayjs.extend(utc);
dayjs.extend(timezone);
export const parseDateToStr = (date: Date): string => {
    return dayjs(date).format(PLAN_ASSIGN_DATE_FORMAT);
};

export const PLAN_SEARCH_PARAMS = {
    CLIENT_ID: 'client_id',
    PLAN_ID: 'plan_id',
    DISCIPLINE: 'discipline',
};

export const PLAN_SELECTED_DRAWER_KEY = 'selected_drawer';

export const PLAN_DRAWER_VIEWS = {
    ASSIGN_DATE: 'assign_date',
    SELECT_CLIENT: 'select_client',
    CREATE_PLAN: 'create_plan',
};
