import {Flex, Image, Stack, Text, Title} from '@mantine/core';
import {memo} from 'react';

import EmptyPlanImage from '@/../public/empty_plan.png';
import {PlanDiscipline} from '@/store/services/plans';

const EMPTY_RESULT_TEXT = {
    search: `We couldn't find any plans matching your search. Try using different keywords.`,
    workout: 'Create personalized strength and endurance plans to guide your clients toward their fitness goals.',
    nutrition: 'Design structured nutrition plans to help your clients build healthy, sustainable eating habits.',
    default: 'Create personalized strength and endurance plans to guide your clients toward their fitness goals.',
};

interface EmptyResultProps {
    discipline: PlanDiscipline;
    search: string;
}

const getDisciplineLabel = (discipline: string) => {
    if (discipline === 'workout') return 'Workout';
    if (discipline === 'nutrition') return 'Nutrition';
    return 'Workout';
};
const EmptyResult = memo<EmptyResultProps>(({search, discipline}) => {
    const getEmptyStateDescription = () => {
        if (search) {
            return EMPTY_RESULT_TEXT[search];
        }

        return EMPTY_RESULT_TEXT[discipline];
    };

    const getEmptyStateTitle = () => {
        if (search) {
            return `No plans found for "${search}"`;
        }
        return `No ${getDisciplineLabel(discipline).toLowerCase()} plans yet`;
    };

    return (
        <Flex
            align="center"
            direction="column"
            gap="lg"
            justify="center"
            px="md"
        >
            <Image
                alt={search ? 'No results illustration' : 'Empty plans illustration'}
                src={EmptyPlanImage}
                w={240}
            />
            <Stack
                align="center"
                gap="xs"
            >
                <Title
                    order={5}
                    ta="center"
                >
                    {getEmptyStateTitle()}
                </Title>
                <Text
                    c="dimmed"
                    maw={400}
                    size="sm"
                    ta="center"
                >
                    {getEmptyStateDescription()}
                </Text>
            </Stack>
        </Flex>
    );
});

EmptyResult.displayName = 'EmptyResult';

export default EmptyResult;
