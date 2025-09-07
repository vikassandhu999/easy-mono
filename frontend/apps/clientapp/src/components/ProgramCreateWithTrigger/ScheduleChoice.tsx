import React from 'react';
import {Group, Title, Text, Button} from '@mantine/core';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import PaddingContainer from '@/Components/Containers/PaddingContainer';

interface ScheduleChoiceProps {
    onSelect: (data: 'now' | 'later') => void;
}

export const ScheduleChoice: React.FC<ScheduleChoiceProps> = ({onSelect}) => {
    return (
        <PagePaper>
            <HeadingContainer paddingY={'xs'}>
                <Group
                    align={'center'}
                    justify={'start'}
                    wrap={'nowrap'}
                >
                    <Title
                        order={4}
                        lineClamp={1}
                    >
                        Build Schedule?
                    </Title>
                </Group>
            </HeadingContainer>

            <PaddingContainer
                paddingX={'sm'}
                paddingY={'xl'}
            >
                <Text
                    size="md"
                    mb="md"
                >
                    Do you want to set up a schedule for this program now? A schedule maps out your sessions, keeps
                    clients on track, and makes progress easy to follow.
                </Text>
                <Group grow>
                    <Button
                        variant="outline"
                        onClick={() => onSelect('later')}
                    >
                        Skip for now
                    </Button>
                    <Button onClick={() => onSelect('now')}>Create schedule</Button>
                </Group>
            </PaddingContainer>
        </PagePaper>
    );
};
