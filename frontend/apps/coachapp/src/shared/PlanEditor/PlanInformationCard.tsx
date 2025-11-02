import {Avatar, Group, Text} from '@mantine/core';
import {IconAt, IconPhoneCall} from '@tabler/icons-react';
import {FC} from 'react';
import {useSearchParams} from 'react-router';

import {Plan} from '@/services/plans';

import {PLAN_EDITOR_SEARCH_PARAMS} from './constants';

export const WEEKDAYS: Record<number, string> = {
    0: 'Monday',
    1: 'Tuesday',
    2: 'Wednesday',
    3: 'Thursday',
    4: 'Friday',
    5: 'Saturday',
    6: 'Sunday',
};

type PlanInformationCardProps = {
    plan: Plan;
};

const PlanInformationCard: FC<PlanInformationCardProps> = ({plan}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const weekday = searchParams.get(PLAN_EDITOR_SEARCH_PARAMS.WEEKDAY);

    return (
        <Group wrap="nowrap">
            <Avatar
                radius="md"
                size={68}
            >
                {plan.name[0] + plan.name[1]}
            </Avatar>
            <div>
                <Text
                    c="dimmed"
                    fw={700}
                    fz="xs"
                    tt="uppercase"
                >
                    {plan.discipline}
                </Text>

                <Text
                    fw={500}
                    fz="lg"
                >
                    {plan.name}
                </Text>

                <Group
                    gap={10}
                    mt={3}
                    wrap="nowrap"
                >
                    <IconAt
                        size={16}
                        stroke={1.5}
                    />
                    <Text
                        c="dimmed"
                        fz="xs"
                    >
                        {WEEKDAYS[weekday]}
                    </Text>
                </Group>
            </div>
        </Group>
    );
};

export default PlanInformationCard;
